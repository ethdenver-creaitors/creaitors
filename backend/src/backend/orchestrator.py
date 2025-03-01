import asyncio
import time

from decimal import Decimal
from typing import Dict, Optional

from aleph.sdk.chains.ethereum import ETHAccount
from aleph.sdk.client.authenticated_http import AuthenticatedAlephHttpClient
from aleph_message.models import PostMessage

from pydantic.main import BaseModel

from backend.agent import get_agent
from backend.aleph import notify_allocation, fetch_instance_ip, amend_message, \
    get_instance_price, create_instance_flow, create_instance_message
from backend.blockchain import make_eth_to_aleph_conversion, convert_aleph_to_eth
from backend.config import config
from backend.models import CRNInfo, AgentDeploymentStatus, FetchedAgentDeployment, HostNotFoundError
from backend.ssh import agent_ssh_deployment
from backend.utils import check_connectivity, run_in_new_loop, format_cost, create_or_recover_ssh_keys, clean_ssh_keys

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
    creator_wallet: Optional[str] = None
    env_variables: Dict[str, str] = {}
    running: bool = False

    class Config:
        arbitrary_types_allowed = True

    async def deploy(self):
        try:
            if not self.running:
                self.running = True
                # Refresh agent post from the network
                agent = await get_agent(str(self.deployment.id))
                self.deployment = agent
                # Get agent creator wallet
                if not self.creator_wallet:
                    async with AuthenticatedAlephHttpClient(
                            account=self.aleph_account, api_server=config.ALEPH_API_URL
                    ) as client:
                        agent_message = await client.get_message(self.deployment.agent_hash, with_status=False)
                        if not agent_message:
                            raise ValueError(f"Agent with hash {self.deployment.agent_hash} not found")

                        if not isinstance(agent_message, PostMessage):
                            raise ValueError(f"Hash {self.deployment.agent_hash} isn't an agent")

                        self.creator_wallet = agent_message.content.address

                await self._continue_actions()
        except:
            raise
        finally:
            self.running = False

    async def _continue_actions(self):
        print(f"Agent is in {self.deployment.status} status")
        if not self.deployment.instance_ip:
            self.deployment.instance_ip = await fetch_instance_ip(TARGET_CRN.url, self.deployment.instance_hash)

        if self.deployment.status == AgentDeploymentStatus.PENDING_FUND:
            await self.create_instance()
            await self._continue_actions()
        if self.deployment.status == AgentDeploymentStatus.PENDING_SWAP:
            await self.create_flows()
            await self._continue_actions()
        elif self.deployment.status == AgentDeploymentStatus.PENDING_ALLOCATION:
            await self.notify()
            await self._continue_actions()
        elif self.deployment.status == AgentDeploymentStatus.PENDING_START:
            await self.check_connectivity()
            await self._continue_actions()
        elif self.deployment.status == AgentDeploymentStatus.PENDING_DEPLOY:
            await self.deploy_code()
            await self._continue_actions()
        elif self.deployment.status == AgentDeploymentStatus.ALIVE:
            print(f"Agent {self.deployment.id} is ALIVE!")
            await self.cleanup()

    async def create_instance(self):
        instance_message = await create_instance_message(
            account=self.aleph_account,
            deployment=self.deployment,
            ssh_public_key=self.ssh_public_key,
            crn=TARGET_CRN,
        )

        self.deployment.instance_hash = instance_message.item_hash
        self.deployment.status = AgentDeploymentStatus.PENDING_SWAP
        self.deployment.last_update = int(time.time())
        await amend_message(self.aleph_account, self.deployment.to_message(), self.deployment.post_hash)

    async def create_flows(self):
        aleph_account = self.aleph_account
        wallet_address = aleph_account.get_address()

        # Create the needed PAYG flows for the Agent Deployment instance
        community_flow_amount, instance_flow_amount = await get_instance_price(self.deployment.instance_hash)
        minimum_required_aleph_tokens = format_cost((community_flow_amount + instance_flow_amount) * 3600 * 4)
        # Add a token offset to ensure converted tokens covers the needs
        convert_required_aleph_tokens = minimum_required_aleph_tokens + Decimal(0.1)

        if aleph_account.get_token_balance() < minimum_required_aleph_tokens:
            try:
                required_eth_to_convert = convert_aleph_to_eth(convert_required_aleph_tokens)
                _ = make_eth_to_aleph_conversion(aleph_account, required_eth_to_convert)
            except Exception as err:
                print(f"Error found converting ETH to ALEPH: {str(err)}")

            aleph_balance = aleph_account.get_token_balance()
            if aleph_balance < minimum_required_aleph_tokens:
                raise ValueError(f"Balance on address {wallet_address} is {aleph_balance} and "
                                 f"it's less than {minimum_required_aleph_tokens} required")

        await create_instance_flow(aleph_account, TARGET_CRN.receiver_address, instance_flow_amount)
        await asyncio.sleep(10)  # Added a sleep time between flows creation to avoid fails
        await create_instance_flow(aleph_account, ALEPH_COMMUNITY_RECEIVER, community_flow_amount)

        self.deployment.status = AgentDeploymentStatus.PENDING_ALLOCATION
        self.deployment.last_update = int(time.time())
        await amend_message(self.aleph_account, self.deployment.to_message(), self.deployment.post_hash)

    async def notify(self):
        try:
            allocation_success = await notify_allocation(TARGET_CRN.url, self.deployment.instance_hash)
        except Exception as err:
            raise ValueError(f"Allocation failed with that message '{str(err)}'")

        if not allocation_success:
            raise ValueError("Allocation failed by some reason")

        self.deployment.status = AgentDeploymentStatus.PENDING_START
        self.deployment.last_update = int(time.time())
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
        self.deployment.last_update = int(time.time())
        await amend_message(self.aleph_account, self.deployment.to_message(), self.deployment.post_hash)

        # Await 5 seconds before trying the next step to connect by SSH
        await asyncio.sleep(5)

    async def deploy_code(self):
        attempts = 5

        for attempt in range(attempts):
            try:
                await self._ssh_deployment()
                break
            except Exception as error:
                if attempt < (attempts - 1):
                    print(f"Agent {self.deployment.id} code deployment failed: {str(error)}")
                    continue
                else:
                    raise

    async def _ssh_deployment(self):
        await agent_ssh_deployment(
            deployment=self.deployment,
            aleph_account=self.aleph_account,
            ssh_private_key=self.ssh_private_key,
            creator_wallet=self.creator_wallet,
            env_variables=self.env_variables,
        )

        self.deployment.status = AgentDeploymentStatus.ALIVE
        self.deployment.last_update = int(time.time())
        await amend_message(self.aleph_account, self.deployment.to_message(), self.deployment.post_hash)

    async def cleanup(self):
        print(f"Cleaning agent {self.deployment.id} remaining data")
        clean_ssh_keys(self.deployment.id)
        print(f"Cleaned agent {self.deployment.id} data")


class DeploymentOrchestrator(BaseModel):
    running_deployments: Dict[str, AgentOrchestration] = {}

    def new(self, deployment: FetchedAgentDeployment, aleph_account: ETHAccount, env_variables: Dict[str, str]):
        ssh_private_key, ssh_public_key = create_or_recover_ssh_keys(deployment.id)

        orchestration = AgentOrchestration(
            aleph_account=aleph_account,
            deployment=deployment,
            ssh_private_key=ssh_private_key,
            ssh_public_key=ssh_public_key,
            env_variables=env_variables,
        )

        self.running_deployments[deployment.id] = orchestration
        run_in_new_loop(orchestration.deploy())

    def get(self, agent_id: str, deploy: bool = False) -> Optional[AgentOrchestration]:
        agent_deployment = self.running_deployments.get(agent_id, None)
        if agent_deployment and deploy:
            run_in_new_loop(agent_deployment.deploy())

        return agent_deployment
