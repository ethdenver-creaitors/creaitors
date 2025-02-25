import os

from coinbase_agentkit import (
    AgentKit,
    AgentKitConfig,
    EthAccountWalletProvider,
    EthAccountWalletProviderConfig,
    erc20_action_provider,
    wallet_action_provider,
    weth_action_provider,
)
from coinbase_agentkit_langchain import get_langchain_tools
from dotenv import load_dotenv
from eth_account import Account
from libertai_agents.agents import ChatAgent
from libertai_agents.interfaces.tools import Tool
from libertai_agents.models import get_model

from .provider import aleph_convertion_action_provider

load_dotenv()

private_key = os.getenv("WALLET_PRIVATE_KEY", None)
assert private_key is not None, "You must set PRIVATE_KEY environment variable"
assert private_key.startswith("0x"), "Private key must start with 0x hex prefix"

# Create Ethereum account from private key
account = Account.from_key(private_key)

# Initialize Ethereum Account Wallet Provider
wallet_provider = EthAccountWalletProvider(
    config=EthAccountWalletProviderConfig(account=account, chain_id="8453")
)

# Initialize AgentKit
agentkit = AgentKit(
    AgentKitConfig(
        wallet_provider=wallet_provider,
        action_providers=[
            aleph_convertion_action_provider(),
            erc20_action_provider(),
            wallet_action_provider(),
            weth_action_provider(),
        ],
    )
)


tools = get_langchain_tools(agentkit)

agent = ChatAgent(
    model=get_model("NousResearch/Hermes-3-Llama-3.1-8B"),
    system_prompt="You are a helpful agent that can interact onchain using an Ethereum Account Wallet. You have tools to send transactions, query blockchain data, and interact with contracts. If you run into a 5XX (internal) error, ask the user to try again later.",
    tools=[Tool.from_langchain(t) for t in tools],
    expose_api=True,
)

app = agent.app
