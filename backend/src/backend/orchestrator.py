import asyncio
import io

import paramiko
from decimal import Decimal
from typing import Dict, Optional

from aleph.sdk.chains.ethereum import ETHAccount
from aleph.sdk.client.authenticated_http import AuthenticatedAlephHttpClient
from aleph.sdk.conf import settings
from aleph_message.models import Chain, Payment, PaymentType, StoreMessage
from aleph_message.models.execution.environment import HypervisorType, HostRequirements, NodeRequirements

from pydantic.main import BaseModel

from backend.agent import get_agent, generate_env_file_content
from backend.aleph import notify_allocation, fetch_instance_ip, amend_message, get_code_file, get_code_hash, \
    get_instance_price
from backend.blockchain import make_eth_to_aleph_conversion, convert_aleph_to_eth
from backend.config import config
from backend.models import CRNInfo, AgentDeploymentStatus, FetchedAgentDeployment, HostNotFoundError
from backend.utils import generate_ssh_key_pair, check_connectivity, run_in_new_loop, format_cost

ALEPH_COMMUNITY_RECEIVER = "0x5aBd3258C5492fD378EBC2e0017416E199e5Da56"
TARGET_CRN = CRNInfo(
    url="https://gpu-test-02.nergame.app",
    hash="e9423d9f9fd27cdc9c4c27d5cf3120ef573eece260d44e6df76b3c27569a3154",
    receiver_address="0xA07B1214bAe0D5ccAA25449C3149c0aC83658874",
)


class AgentOrchestration(BaseModel):
    aleph_account: ETHAccount
    deployment: FetchedAgentDeployment
    ssh_private_key: str
    ssh_public_key: str
    env_variables: Dict[str, str]

    class Config:
        arbitrary_types_allowed = True

    async def deploy(self):
        # Refresh agent post from the network
        agent = await get_agent(str(self.deployment.id))
        self.deployment = agent
        await self._continue_actions()

    async def _continue_actions(self):
        if not self.deployment.instance_ip:
            self.deployment.instance_ip = await fetch_instance_ip(TARGET_CRN.url, self.deployment.instance_hash)

        if self.deployment.status == AgentDeploymentStatus.PENDING_FUND:
            await self.create_instance()
            print(f"Agent is in {self.deployment.status} status")
            await self._continue_actions()
        elif self.deployment.status == AgentDeploymentStatus.PENDING_ALLOCATION:
            await self.notify()
            print(f"Agent is in {self.deployment.status} status")
            await self._continue_actions()
        elif self.deployment.status == AgentDeploymentStatus.PENDING_START:
            await self.check_connectivity()
            print(f"Agent is in {self.deployment.status} status")
            await self._continue_actions()
        elif self.deployment.status == AgentDeploymentStatus.PENDING_DEPLOY:
            await self.deploy_code()
            await self._continue_actions()
        elif self.deployment.status == AgentDeploymentStatus.ALIVE:
            print(f"Agent {self.deployment.id} is ALIVE!")

    async def create_instance(self):
        async with AuthenticatedAlephHttpClient(
                account=self.aleph_account, api_server=config.ALEPH_API_URL
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

            aleph_account = self.aleph_account
            wallet_address = aleph_account.get_address()

            # TODO: Find the proper way to select the base CRN, by the moment get a fixed CRN
            instance_message, _status = await client.create_instance(
                rootfs=rootfs,
                rootfs_size=rootfs_size,
                hypervisor=HypervisorType.qemu,
                payment=Payment(chain=Chain.BASE, type=PaymentType.superfluid, receiver=TARGET_CRN.receiver_address),
                requirements=HostRequirements(
                    node=NodeRequirements(
                        node_hash=TARGET_CRN.hash,
                    )
                ),
                channel=config.ALEPH_CHANNEL,
                address=wallet_address,
                ssh_keys=[
                    self.ssh_public_key,
                    # Give access to the VM only on development/testing time
                    config.DEVELOPMENT_PUBLIC_KEY,
                    config.DEVELOPMENT_ALT_PUBLIC_KEY
                ],
                metadata={
                    "agent_id": self.deployment.id,
                    "agent_hash": self.deployment.agent_hash,
                    "name": self.deployment.name
                },
                vcpus=settings.DEFAULT_VM_VCPUS,
                memory=settings.DEFAULT_INSTANCE_MEMORY,
                sync=True,
            )

            self.deployment.status = AgentDeploymentStatus.PENDING_ALLOCATION
            self.deployment.instance_hash = instance_message.item_hash

        # Create the needed PAYG flows for the Agent Deployment instance
        community_flow_amount, instance_flow_amount = await get_instance_price(self.deployment.instance_hash)
        minimum_required_aleph_tokens = format_cost((community_flow_amount + instance_flow_amount) * 3600 * 4)
        convert_required_aleph_tokens = minimum_required_aleph_tokens + Decimal(0.1)

        try:
            required_eth_to_convert = convert_aleph_to_eth(convert_required_aleph_tokens)
            _ = make_eth_to_aleph_conversion(aleph_account, required_eth_to_convert)
        except Exception as err:
            print(f"Error found converting ETH to ALEPH: {str(err)}")

        aleph_balance = aleph_account.get_token_balance()
        if aleph_balance < minimum_required_aleph_tokens:
            raise ValueError(f"Balance on address {wallet_address} is {aleph_balance} and "
                             f"it's less than {minimum_required_aleph_tokens} required")

        operator_flow_tx = await aleph_account.create_flow(
            receiver=TARGET_CRN.receiver_address,
            flow=instance_flow_amount
        )
        print(f"Operator flow created with TX hash {operator_flow_tx}")
        await asyncio.sleep(10)  # Added a sleep time between flows creation to avoid fails
        community_flow_tx = await aleph_account.create_flow(
            receiver=ALEPH_COMMUNITY_RECEIVER,
            flow=community_flow_amount
        )
        print(f"Community flow created with TX hash {community_flow_tx}")

        if community_flow_tx == "" or operator_flow_tx == "":
            message = f"Flow creation failed, please check the remaining flows:\n" \
                  f"Operator Flow Tx {operator_flow_tx}\n" \
                  f"Community Flow Tx {community_flow_tx}\n"
            print(message)
            raise ValueError(message)

        await amend_message(self.aleph_account, self.deployment.to_message(), self.deployment.post_hash)

    async def notify(self):
        try:
            allocation_success = await notify_allocation(TARGET_CRN.url, self.deployment.instance_hash)
        except Exception as err:
            raise ValueError(f"Allocation failed with that message '{str(err)}'")

        if not allocation_success:
            raise ValueError("Allocation failed by some reason")

        self.deployment.status = AgentDeploymentStatus.PENDING_START
        await amend_message(self.aleph_account, self.deployment.to_message(), self.deployment.post_hash)

        instance_ip = await fetch_instance_ip(TARGET_CRN.url, self.deployment.instance_hash)
        if not instance_ip:
            raise ValueError(f"Instance {self.deployment.instance_hash} not found on CRN {TARGET_CRN.url}")
        self.deployment.instance_ip = instance_ip

    async def check_connectivity(self):
        if not self.deployment.instance_ip:
            raise ValueError(f"Instance {self.deployment.instance_hash} IP"
                             f" not defined for agent deployment {self.deployment.id}")

        attempts = 30
        timeout_seconds = 5

        for attempt in range(attempts):
            try:
                await check_connectivity(self.deployment.instance_ip, packets=1, timeout=timeout_seconds)
                break
            except HostNotFoundError:
                if attempt < (attempts - 1):
                    continue
                else:
                    raise

        self.deployment.status = AgentDeploymentStatus.PENDING_DEPLOY
        await amend_message(self.aleph_account, self.deployment.to_message(), self.deployment.post_hash)

    async def deploy_code(self):
        # Create a Paramiko SSH client
        ssh_client = paramiko.SSHClient()
        ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        # Load private key from string
        rsa_key = paramiko.RSAKey(file_obj=io.StringIO(self.ssh_private_key))

        # Get code file
        agent_hash = self.deployment.agent_hash
        code_hash = await get_code_hash(agent_hash)
        if not code_hash:
            raise ValueError(f"Code hash not found for Agent hash {agent_hash}")

        code_filename = await get_code_file(code_hash)
        content = open(code_filename, mode="rb").read()

        # Connect to the server
        ssh_client.connect(hostname=self.deployment.instance_ip, username="root", pkey=rsa_key)

        # Send the zip with the code
        sftp = ssh_client.open_sftp()
        remote_path = "/tmp/libertai-agent.zip"
        sftp.putfo(io.BytesIO(content), remote_path)
        sftp.close()

        # Send the env variable file
        sftp = ssh_client.open_sftp()
        wallet_private_key = self.aleph_account.export_private_key()
        content = generate_env_file_content(wallet_private_key, None)
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

        # Close the connection
        ssh_client.close()

        self.deployment.status = AgentDeploymentStatus.ALIVE
        await amend_message(self.aleph_account, self.deployment.to_message(), self.deployment.post_hash)


class DeploymentOrchestrator(BaseModel):
    running_deployments: Dict[str, AgentOrchestration] = {}

    def new(self, deployment: FetchedAgentDeployment, aleph_account: ETHAccount, env_variables: Dict[str, str]):
        ssh_private_key, ssh_public_key = generate_ssh_key_pair()
        # ssh_private_key = TESTING_SSH_PRIVATE_KEY
        # ssh_public_key = TESTING_SSH_PUBLIC_KEY

        orchestration = AgentOrchestration(
            aleph_account=aleph_account,
            deployment=deployment,
            ssh_private_key=ssh_private_key,
            ssh_public_key=ssh_public_key,
            env_variables=env_variables,
        )

        self.running_deployments[deployment.id] = orchestration

        run_in_new_loop(orchestration.deploy())

    def get(self, agent_id: str) -> Optional[FetchedAgentDeployment]:
        agent_deployment = self.running_deployments.get(agent_id) or None
        if not agent_deployment:
            return None

        return agent_deployment.deployment





