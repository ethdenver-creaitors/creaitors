import asyncio
import base64
import hashlib
import io
import platform
import subprocess
import threading
from decimal import Decimal, ROUND_FLOOR
from pathlib import Path
from typing import Tuple
from urllib.parse import urlparse, ParseResult

import aiohttp
import paramiko

from uuid import UUID
from web3 import Web3
from eth_account.messages import encode_defunct
from hexbytes import HexBytes

from ecies import encrypt as ecies_encrypt, decrypt as ecies_decrypt

from backend.config import config
from backend.models import HostNotFoundError

PRICE_PRECISION = 18


def generate_ssh_key_pair() -> tuple[str, str]:
    # Generate RSA key pair
    key = paramiko.RSAKey.generate(4096)

    # Serialize private key to string
    private_key_io = io.StringIO()
    key.write_private_key(private_key_io)
    private_key_str = private_key_io.getvalue()

    # Generate public key in OpenSSH format
    public_key_str = f"{key.get_name()} {key.get_base64()}"

    return private_key_str, public_key_str


def encrypt(data: str, public_key: str | bytes) -> str:
    """Encrypt some data with a public key"""

    encrypted_data = ecies_encrypt(public_key, data.encode())
    # Encoding it in base64 to avoid data loss when stored on Aleph
    base64_encrypted_data = base64.b64encode(encrypted_data).decode()

    return base64_encrypted_data


def decrypt(data: str, private_key: str | bytes) -> str:
    """Decrypt data with a private key"""

    # Decode the base64 data
    encrypted_data = base64.b64decode(data)
    decrypted_data = ecies_decrypt(private_key, encrypted_data).decode()

    return decrypted_data


def check_agent_key(agent_id: UUID, owner: str, agent_key: str) -> bool:
    agent_account_message = f"{config.WALLET_MESSAGE} {owner} {agent_id}"

    w3 = Web3(Web3.HTTPProvider(""))
    message = encode_defunct(text=agent_account_message)
    address = w3.eth.account.recover_message(message, signature=agent_key)

    return address == owner


def generate_predictable_key(agent_account_key: str) -> bytes:
    agent_proof = f"{config.WALLET_PROOF}{agent_account_key}".encode("utf-8")
    return hashlib.sha3_256(agent_proof).digest()


async def run_in_subprocess(command: list[str], check: bool = True, stdin_input: bytes | None = None) -> bytes:
    """Run the specified command in a subprocess, returns the stdout of the process."""
    command = [str(arg) for arg in command]

    process = await asyncio.create_subprocess_exec(
        *command,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await process.communicate(input=stdin_input)

    if check and process.returncode:
        print(
            f"Command failed with error code {process.returncode}:\n"
            f"    stdin = {stdin_input!r}\n"
            f"    command = {command}\n"
            f"    stdout = {stderr!r}"
        )
        raise subprocess.CalledProcessError(process.returncode, str(command), stderr.decode())

    return stdout


async def check_connectivity(host: str, packets: int, timeout: int):
    """
    Waits for a host to respond to a ping request.
    """

    try:
        if not is_mac_host():
            await run_in_subprocess(["ping", "-c", str(packets), "-W", str(timeout), host], check=True)
        else:
            # Only for MacOS
            await run_in_subprocess(["ping6", "-c", str(packets), "-i", str(timeout * 1000), host], check=True)
    except subprocess.CalledProcessError as err:
        raise HostNotFoundError() from err


def is_mac_host() -> bool:
    return platform.system() == "Darwin"


def run_in_new_loop(coroutine):
    """Ejecuta una corrutina en un nuevo bucle de eventos."""
    def run_loop():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(coroutine)
        loop.close()
    thread = threading.Thread(target=run_loop)
    thread.start()


def format_cost(v: Decimal | str, p: int = PRICE_PRECISION) -> Decimal:
    return Decimal(v).quantize(Decimal(1) / Decimal(10**p), ROUND_FLOOR)


def create_or_recover_ssh_keys(agent_id: str) -> Tuple[str, str]:
    # TODO: Load existing ssh keys if they exists, if not just create random ones
    private_key_path = Path(f"{config.KEYS_PATH}/{agent_id}_private.key")
    public_key_path = Path(f"{config.KEYS_PATH}/{agent_id}_public.key")
    if private_key_path.exists() and public_key_path.exists():
        ssh_private_key = private_key_path.read_text()
        ssh_public_key = public_key_path.read_text()
    else:
        ssh_private_key, ssh_public_key = generate_ssh_key_pair()
        private_key_path.write_text(ssh_private_key)
        public_key_path.write_text(ssh_public_key)

    return ssh_private_key, ssh_public_key


def clean_ssh_keys(agent_id: str):
    private_key_path = Path(f"{config.KEYS_PATH}/{agent_id}_private.key")
    public_key_path = Path(f"{config.KEYS_PATH}/{agent_id}_public.key")
    if private_key_path.exists():
        private_key_path.unlink()
    if public_key_path.exists():
        public_key_path.unlink()

