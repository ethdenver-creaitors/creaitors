import asyncio
import os
import threading
import time

import schedule
from coinbase_agentkit import (
    AgentKit,
    AgentKitConfig,
    EthAccountWalletProvider,
    EthAccountWalletProviderConfig,
    erc20_action_provider,
    wallet_action_provider,
)
from coinbase_agentkit_langchain import get_langchain_tools
from dotenv import load_dotenv
from eth_account import Account
from libertai_agents.agents import ChatAgent
from libertai_agents.interfaces.messages import Message
from libertai_agents.interfaces.tools import Tool
from typing_extensions import Unpack

from .interfaces import AutonomousAgentConfig, ChatAgentArgs
from .provider import aleph_convertion_action_provider
from .utils import get_provider_langchain_tools


class AutonomousAgent:
    agent: ChatAgent
    autonomous_agent_config: AutonomousAgentConfig
    done: bool = False

    def __init__(
        self, autonomous_config: AutonomousAgentConfig, **kwargs: Unpack[ChatAgentArgs]
    ):
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
                ],
            )
        )

        agentkit_tools = get_langchain_tools(agentkit)

        if kwargs["tools"] is None:
            kwargs["tools"] = []
        kwargs["tools"].extend([Tool.from_langchain(t) for t in agentkit_tools])  # type: ignore

        existing_action_providers = [
            action_provider.name for action_provider in agentkit.action_providers
        ]

        for (
            ak_action_provider
        ) in autonomous_config.agentkit_additional_action_providers:
            if ak_action_provider.name in existing_action_providers:
                raise ValueError(
                    f"The AgentKit action provider '{ak_action_provider.name}' is already present for the autonomous agent behavior, please remove it."
                )
            kwargs["tools"].extend(  # type: ignore
                [
                    Tool.from_langchain(t)
                    for t in get_provider_langchain_tools(
                        ak_action_provider, agentkit.wallet_provider
                    )
                ]
            )

        self.agent = ChatAgent(**kwargs)
        self.autonomous_agent_config = autonomous_config

        # Schedule the function
        schedule.every(10).seconds.do(
            self.run_async_task, self.manage_computing_credits
        )
        thread = threading.Thread(target=self.run_scheduler, daemon=True)
        thread.start()

    async def manage_computing_credits(self) -> None:
        """Call the agent to make it decide if it wants to buy $ALEPH for computing or not"""
        if self.done is True:
            return
        async for message in self.agent.generate_answer(
            messages=[
                Message(
                    role="user",
                    content="Perform your task",
                )
            ],
            system_prompt=self.autonomous_agent_config.computing_credits_system_prompt,
            only_final_answer=False,
        ):
            print(message)
        print("Done")
        self.done = True

    @staticmethod
    def run_async_task(func):
        """Runs an async function inside an event loop."""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(func())

    @staticmethod
    def run_scheduler() -> None:
        """Continuously run scheduled tasks in a separate thread."""
        while True:
            schedule.run_pending()
            time.sleep(10)  # Prevents excessive CPU usage
