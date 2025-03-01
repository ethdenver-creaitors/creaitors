import io
from typing import Dict

import paramiko

from aleph.sdk.chains.ethereum import ETHAccount

from backend.agent import generate_fixed_env_variables, generate_env_file_content
from backend.aleph import get_code_hash, get_code_file
from backend.config import config
from backend.models import FetchedAgentDeployment


async def agent_ssh_deployment(
        deployment: FetchedAgentDeployment,
        aleph_account: ETHAccount,
        ssh_private_key: str,
        creator_wallet: str,
        env_variables: Dict[str, str]
):
    # Create a Paramiko SSH client
    ssh_client = paramiko.SSHClient()
    ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    # Load private key from string
    rsa_key = paramiko.RSAKey(file_obj=io.StringIO(ssh_private_key))

    # Get code file
    agent_hash = deployment.agent_hash
    code_hash = await get_code_hash(agent_hash)
    if not code_hash:
        raise ValueError(f"Code hash not found for Agent hash {agent_hash}")

    code_filename = await get_code_file(code_hash)
    content = open(code_filename, mode="rb").read()

    try:
        # Connect to the server
        ssh_client.connect(hostname=deployment.instance_ip, username="root", pkey=rsa_key)

        # Send the zip with the code
        sftp = ssh_client.open_sftp()
        remote_path = "/tmp/libertai-agent.zip"
        sftp.putfo(io.BytesIO(content), remote_path)
        sftp.close()

        # Send the env variable file
        sftp = ssh_client.open_sftp()
        wallet_private_key = aleph_account.export_private_key()

        fixed_env_variables = generate_fixed_env_variables(
            private_key=wallet_private_key,
            creator_address=creator_wallet,
            owner_address=deployment.owner,
        )
        content = generate_env_file_content(fixed_env_variables, env_variables)
        remote_path = "/tmp/.env"
        sftp.putfo(io.BytesIO(content), remote_path)
        sftp.close()

        # Send the deployment script
        script_path = f"{config.SCRIPTS_PATH}/deploy.sh"
        content = open(script_path, mode="rb").read()
        sftp = ssh_client.open_sftp()
        remote_path = "/tmp/deploy-agent.sh"
        sftp.putfo(io.BytesIO(content), remote_path)
        sftp.close()

        # Execute the command
        # TODO: Detect the usage type, by default use "fastapi"
        usage_type = "fastapi"
        _stdin, _stdout, stderr = ssh_client.exec_command(
            f"chmod +x {remote_path} && {remote_path} 3.12 poetry {usage_type}"
        )

        # Waiting for the command to complete to get error logs
        stderr.channel.recv_exit_status()
    except Exception as error:
        raise ValueError(str(error))
    finally:
        # Close the connection
        ssh_client.close()