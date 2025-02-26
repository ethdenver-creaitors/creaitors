from decimal import Decimal
from http import HTTPStatus
from pathlib import Path

from fastapi import HTTPException
from typing import Optional, Any, Tuple

from ipaddress import IPv6Interface
from json import JSONDecodeError

from aiohttp import (
    ClientConnectorError,
    ClientResponseError,
    ConnectionTimeoutError,
    ClientSession,
    ClientTimeout,
    InvalidURL,
)

from aleph.sdk.chains.ethereum import ETHAccount
from aleph.sdk.client.authenticated_http import AuthenticatedAlephHttpClient, AlephHttpClient
from aleph.sdk.query.filters import PostFilter
from aleph_message.models import InstanceMessage

from backend.config import config
from backend.utils import async_lru_cache, format_cost

CRN_LIST_HOST_URL = "https://dchq.staging.aleph.sh"
crn_list_link = (
    f"{CRN_LIST_HOST_URL}/vm/bec08b08bb9f9685880f3aeb9c1533951ad56abef2a39c97f5a93683bdaa5e30/crns.json"
)

PATH_ABOUT_EXECUTIONS_LIST = "/about/executions/list"
PATH_INSTANCE_NOTIFY = "/control/allocation/notify"
COMMUNITY_FLOW_PERCENTAGE = Decimal(0.2)


@async_lru_cache
async def fetch_crn_list() -> Optional[dict]:
    """Call program to fetch the compute resource node list.

    Returns:
        dict: Dictionary containing the compute resource node list.
    """

    try:
        async with ClientSession(timeout=ClientTimeout(total=60)) as session:
            async with session.get(crn_list_link) as resp:
                if resp.status != 200:
                    error = "Unable to fetch crn list from program"
                    raise Exception(error)
                return await resp.json()
    except InvalidURL as e:
        error = f"Invalid URL: {crn_list_link}: {e}"
    except TimeoutError as e:
        error = f"Timeout while fetching: {crn_list_link}: {e}"
    except ClientConnectorError as e:
        error = f"Error on connection: {crn_list_link}: {e}"
    except ClientResponseError as e:
        error = f"Error on response: {crn_list_link}: {e}"
    except JSONDecodeError as e:
        error = f"Error when decoding JSON: {crn_list_link}: {e}"
    except Exception as e:
        error = f"Unexpected error while fetching: {crn_list_link}: {e}"
    raise Exception(error)


async def fetch_instance_ip(crn_url: str, item_hash: str) -> str:
    """
    Fetches IPv6 of an allocated instance given a message hash.

    Args:
        crn_url: Url of CRN.
        item_hash: Instance message hash.
    Returns:
        IPv6 address
    """

    async with ClientSession() as session:
        try:
            async with session.get(
                    f"{crn_url}{PATH_ABOUT_EXECUTIONS_LIST}"
            ) as resp:
                resp.raise_for_status()
                executions = await resp.json()

                if item_hash in executions:
                    interface = IPv6Interface(executions[item_hash]["networking"]["ipv6"])
                    return str(interface.ip + 1)
        except (
                ClientResponseError,
                ClientConnectorError,
                ConnectionTimeoutError,
        ):
            raise ValueError()

    return ""


async def amend_message(account: ETHAccount, content: Any, ref: str):
    async with AuthenticatedAlephHttpClient(
            account=account, api_server=config.ALEPH_API_URL
    ) as client:
        await client.create_post(
            address=account.get_address(),
            post_content=content,
            post_type="amend",
            ref=ref,
            channel=config.ALEPH_CHANNEL,
        )


async def notify_allocation(crn_url: str, instance_hash: str) -> bool:
    async with ClientSession() as session:
        try:
            async with session.post(
                    f"{crn_url}{PATH_INSTANCE_NOTIFY}",
                    json={
                        "instance": instance_hash
                    }
            ) as resp:
                if not resp.ok:
                    error_text = await resp.text()
                    raise ValueError(error_text)

                return True
        except (
                ClientResponseError,
                ClientConnectorError,
                ConnectionTimeoutError,
        ):
            raise ValueError()

    return False


async def get_code_file(code_hash: str) -> Optional[str]:
    async with AlephHttpClient(api_server=config.ALEPH_API_URL) as client:
        code_stored_content = await client.get_stored_content(code_hash)
        if not code_stored_content:
            return None

        code_filename = f"{code_hash}.zip"
        if code_stored_content.filename:
            code_filename = code_stored_content.filename

        try:
            code_filename_path = f"{config.CODE_FILES_PATH}/{code_filename}"
            # If the file already exists, just return the path
            if Path(code_filename_path).is_file():
                return code_filename_path

            async with ClientSession() as session:
                async with session.get(code_stored_content.url) as resp:
                    resp.raise_for_status()
                    data = await resp.read()
                    with open(code_filename_path, mode="wb") as file:
                        file.write(data)
        except Exception as error:
            error_message = str(error)
            print(f"Error ocurred downloading the code: {error_message}")
            return None

    return code_filename_path


async def get_code_hash(agent_hash: str) -> Optional[str]:
    async with AlephHttpClient(api_server=config.ALEPH_API_URL) as client:
        agent_messages = await client.get_posts(
            post_filter=PostFilter(
                types=[config.ALEPH_AGENT_POST_TYPE],
                hashes=[agent_hash]
            )
        )

        if len(agent_messages.posts) < 1:
            return None

        agent_message = agent_messages.posts[0]
        source_code_hash = agent_message.content.get("source_code_hash")

        if not source_code_hash:
            return None

        return source_code_hash


async def get_instance_price(item_hash: str) -> Tuple[Decimal, Decimal]:
    async with AlephHttpClient(api_server=config.ALEPH_API_URL) as client:
        instance_message = await client.get_message(item_hash, with_status=False)
        if not instance_message:
            raise ValueError(f"Instance with hash {item_hash} doesn't exists")

        if not isinstance(instance_message, InstanceMessage):
            raise ValueError(f"VM with hash {item_hash} isn't an Instance")

        estimated_price = await client.get_estimated_price(content=instance_message)
        required_tokens = estimated_price.required_tokens
        required_community_tokens = format_cost(required_tokens * COMMUNITY_FLOW_PERCENTAGE)
        required_operator_tokens = format_cost(required_tokens * (1 - COMMUNITY_FLOW_PERCENTAGE))
        return required_community_tokens, required_operator_tokens

