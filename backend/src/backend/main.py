import time
from decimal import Decimal

from fastapi import FastAPI, Depends, Request
from starlette.middleware.cors import CORSMiddleware

from aleph.sdk.client.authenticated_http import AuthenticatedAlephHttpClient
from aleph.sdk.client.abstract import MessageFilter
from aleph_message.models import ItemHash, Chain, MessageType

from .agent import get_agent
from .blockchain import CustomETHAccount
from .config import config
from .models import AgentDeployment, AgentDeploymentStatus, AgentRequest
from .orchestrator import DeploymentOrchestrator
from .utils import check_agent_key, generate_predictable_key

# TODO: Calculate required tokens in realtime
MINIMUM_REQUIRED_AMOUNT = Decimal(0.005)  # At least have around $10 in ETH


# FastAPI Application Factory
def create_app() -> FastAPI:
    """Creates the FastAPI application.
    """
    application = FastAPI(title='CreAItors agents')

    origins = [
        "https://console.creaitors.io",
        "http://localhost:3000",
    ]

    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register our singleton service for DI once when the app has finished startup
    @application.on_event('startup')
    def load_orchestrator_service():
        application.state.orchestrator = DeploymentOrchestrator()

    return application


# Helper to grab dependencies that live in the app.state
def get_orchestrator_service(request: Request) -> DeploymentOrchestrator:
    return request.app.state.orchestrator


app = create_app()


@app.get("/", description="Index page")
async def index():
    return {
        "welcome": "Welcome to CreAItors Backend"
    }


@app.post("/agent", description="Setup a new autonomous agent")
async def create_agent_deployment(agent_request: AgentRequest):
    agent_account_key = agent_request.agent_key
    agent_id = agent_request.agent_id
    verify_result = check_agent_key(agent_request.agent_id, agent_request.owner, agent_account_key)

    if not verify_result:
        return {
            "error": True,
            "message": "Invalid signature from that owner"
        }

    agent = await get_agent(str(agent_id), check_result=False)
    if agent:
        return {
            "error": True,
            "message": f"Agent {agent_id} already deployed"
        }

    agent_proof_key = generate_predictable_key(agent_account_key)
    aleph_account = CustomETHAccount(agent_proof_key, chain=Chain.BASE)
    address = aleph_account.get_address()

    agent = AgentDeployment(
        id=str(agent_id),
        name=agent_request.name,
        owner=agent_request.owner,
        required_tokens=MINIMUM_REQUIRED_AMOUNT,
        wallet_address=address,
        agent_hash=agent_request.agent_hash,
        last_update=int(time.time()),
        tags=[str(agent_id), agent_request.owner],
        status=AgentDeploymentStatus.PENDING_FUND,
    )

    async with AuthenticatedAlephHttpClient(
            account=aleph_account, api_server=config.ALEPH_API_URL
    ) as client:
        await client.create_post(
            address=address,
            post_content=agent.dict(),
            post_type=config.ALEPH_AGENT_DEPLOYMENT_POST_TYPE,
            channel=config.ALEPH_CHANNEL,
        )

    return {
        "required_tokens": agent.required_tokens,
        "wallet_address": address
    }


@app.post("/agent/deploy", description="Deploy a new autonomous agent")
async def deploy_agent(
    agent_request: AgentRequest,
    orchestrator: DeploymentOrchestrator = Depends(get_orchestrator_service)
):
    agent_id = agent_request.agent_id
    agent_account_key = agent_request.agent_key

    verify_result = check_agent_key(agent_id, agent_request.owner, agent_account_key)
    if not verify_result:
        return {
            "error": True,
            "message": "Invalid signature from that owner"
        }

    agent = await get_agent(str(agent_id))
    if not agent:
        return {
            "error": True,
            "message": f"Agent {agent_id} not found"
        }

    agent_proof_key = generate_predictable_key(agent_account_key)
    aleph_account = CustomETHAccount(agent_proof_key, chain=Chain.BASE)
    wallet_address = aleph_account.get_address()
    eth_balance = aleph_account.get_eth_balance()
    if eth_balance < MINIMUM_REQUIRED_AMOUNT:
        return {
            "error": True,
            "message": f"Insufficient balance, {'{0:.18f}'.format(MINIMUM_REQUIRED_AMOUNT)} ETH required "
                       f"on wallet {wallet_address} instead {eth_balance}"
        }

    # Only for debugging and to not consume resources for testing
    # async with AuthenticatedAlephHttpClient(
    #         account=aleph_account, api_server=config.ALEPH_API_URL
    # ) as client:
    #     resp = await client.get_messages(
    #         message_filter=MessageFilter(
    #             message_types=[MessageType.instance, MessageType.post],
    #             addresses=[wallet_address]
    #         )
    #     )
    #     hashes = []
    #     for message in resp.messages:
    #         hashes.append(message.item_hash)
    #
    #     if len(hashes) > 0:
    #         forget_message, _ = await client.forget(hashes=hashes, reason="I don't need it")
    #         print(f"Messages forgotten by {forget_message.item_hash}")
    #
    # # Clean pending flows
    # await aleph_account.delete_flow(receiver="0xA07B1214bAe0D5ccAA25449C3149c0aC83658874")
    # await aleph_account.delete_flow(receiver="0x5aBd3258C5492fD378EBC2e0017416E199e5Da56")
    # print("Remaining flows stopped")

    # Create and start the autonomous agent deployment
    deployment = orchestrator.get(agent_id=str(agent_id))
    if not deployment:
        orchestrator.new(
            deployment=agent,
            aleph_account=aleph_account,
            env_variables=agent_request.env_variables
        )

    return {
        "error": False,
        "message": "Agent deployed started successfully",
    }


@app.get("/agent/{agent_id}", description="Get an agent information")
async def get_agent_info(
    agent_id: str,
    orchestrator: DeploymentOrchestrator = Depends(get_orchestrator_service)
):
    """Get an agent by an agent ID"""
    agent = orchestrator.get(agent_id)
    if not agent:
        agent = await get_agent(agent_id)
        if not agent:
            return {
                "error": True,
                "message": f"Agent with id {agent_id} not found",
            }

    return agent
