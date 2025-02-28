from decimal import Decimal
from pathlib import Path

from typing import Optional, Any, Tuple

from aiohttp import (
    ClientConnectorError,
    ClientResponseError,
    ConnectionTimeoutError,
    ClientSession,
)
from ipaddress import IPv6Interface

from aleph.sdk.chains.ethereum import ETHAccount
from aleph.sdk.client.authenticated_http import AuthenticatedAlephHttpClient, AlephHttpClient
from aleph.sdk.conf import settings
from aleph.sdk.evm_utils import FlowUpdate
from aleph.sdk.query.filters import PostFilter
from aleph_message.models import InstanceMessage, Chain, Payment, PaymentType, StoreMessage
from aleph_message.models.execution.environment import HypervisorType, HostRequirements, NodeRequirements

from backend.config import config
from backend.models import FetchedAgentDeployment, CRNInfo
from backend.utils import format_cost

PATH_ABOUT_EXECUTIONS_LIST = "/about/executions/list"
PATH_INSTANCE_NOTIFY = "/control/allocation/notify"
COMMUNITY_FLOW_PERCENTAGE = Decimal(0.2)


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


async def create_instance_message(
        account: ETHAccount,
        deployment: FetchedAgentDeployment,
        ssh_public_key: str,
        crn: CRNInfo
) -> InstanceMessage:
    async with AuthenticatedAlephHttpClient(
            account=account, api_server=config.ALEPH_API_URL
    ) as client:
        rootfs = settings.UBUNTU_24_QEMU_ROOTFS_ID
        rootfs_message: StoreMessage = await client.get_message(
            item_hash=rootfs, message_type=StoreMessage
        )
        rootfs_size = (
            rootfs_message.content.size
            if rootfs_message.content.size is not None
            else settings.DEFAULT_ROOTFS_SIZE
        )

        # TODO: Find the proper way to select the base CRN, at the moment get a fixed CRN
        instance_message, _status = await client.create_instance(
            rootfs=rootfs,
            rootfs_size=rootfs_size,
            hypervisor=HypervisorType.qemu,
            payment=Payment(chain=Chain.BASE, type=PaymentType.superfluid, receiver=crn.receiver_address),
            requirements=HostRequirements(
                node=NodeRequirements(
                    node_hash=crn.hash,
                )
            ),
            channel=config.ALEPH_CHANNEL,
            address=account.get_address(),
            ssh_keys=[
                ssh_public_key,
                # Give access to the VM only on development/testing time
                config.DEVELOPMENT_PUBLIC_KEY,
                config.DEVELOPMENT_ALT_PUBLIC_KEY
            ],
            metadata={
                "agent_id": deployment.id,
                "agent_hash": deployment.agent_hash,
                "name": deployment.name
            },
            vcpus=settings.DEFAULT_VM_VCPUS,
            memory=settings.DEFAULT_INSTANCE_MEMORY,
            sync=True,
        )
        return instance_message


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

        estimated_price = await client.get_estimated_price(content=instance_message.content)
        required_tokens = Decimal(estimated_price.required_tokens)
        required_community_tokens = format_cost(required_tokens * COMMUNITY_FLOW_PERCENTAGE)
        required_operator_tokens = format_cost(required_tokens * (1 - COMMUNITY_FLOW_PERCENTAGE))
        return required_community_tokens, required_operator_tokens


async def create_instance_flow(aleph_account: ETHAccount, receiver_address: str, instance_flow_amount: Decimal):
    existing_flow = await aleph_account.get_flow(receiver_address)
    existing_flow_rate = Decimal(existing_flow["flowRate"] or 0)
    if existing_flow_rate < instance_flow_amount:
        flow_to_update = instance_flow_amount - existing_flow_rate
        operator_flow_tx = await aleph_account.manage_flow(
            receiver=receiver_address,
            flow=flow_to_update,
            update_type=FlowUpdate.INCREASE,
        )
        print(f"Flow created to {receiver_address} with TX hash {operator_flow_tx}")

