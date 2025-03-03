import time
from decimal import Decimal

from fastapi import FastAPI, Depends, Request
from starlette.middleware.cors import CORSMiddleware

from aleph.sdk.client.authenticated_http import AuthenticatedAlephHttpClient
from aleph_message.models import Chain

from .agent import get_agent
from .blockchain import CustomETHAccount, web3_from_wei
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

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
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
    eth_balance = web3_from_wei(int(aleph_account.get_eth_balance()), "ether")

    print(wallet_address)

    if eth_balance < MINIMUM_REQUIRED_AMOUNT:
        return {
            "error": True,
            "message": f"Insufficient balance, {'{0:.18f}'.format(MINIMUM_REQUIRED_AMOUNT)} ETH required "
                       f"on wallet {wallet_address} instead {'{0:.18f}'.format(eth_balance)}"
        }

    # Create and start the autonomous agent deployment
    deployment = orchestrator.get(agent_id=str(agent_id), deploy=True)
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
    deployment = orchestrator.get(agent_id)
    if deployment:
        return deployment.deployment

    agent = await get_agent(agent_id)
    if not agent:
        return {
            "error": True,
            "message": f"Agent with id {agent_id} not found",
        }

    return agent
