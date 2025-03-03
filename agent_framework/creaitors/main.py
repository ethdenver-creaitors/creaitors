import asyncio
import datetime
import logging
import os
from logging import Logger

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
from libertai_agents.interfaces.messages import (
    Message,
    ToolCallMessage,
    ToolResponseMessage,
)
from libertai_agents.interfaces.tools import Tool
from typing_extensions import Unpack

from .interfaces import AutonomousAgentConfig, ChatAgentArgs
from .provider import aleph_action_provider
from .utils import get_provider_langchain_tools


class AutonomousAgent:
    agent: ChatAgent
    autonomous_agent_config: AutonomousAgentConfig
    __computing_think_done: bool = False
    __logger: Logger
    __logs_storage: dict[str, str]

    def __init__(
        self, autonomous_config: AutonomousAgentConfig, **kwargs: Unpack[ChatAgentArgs]
    ):
        load_dotenv()

        private_key = os.getenv("AGENT_WALLET_PRIVATE_KEY", None)
        assert private_key is not None, (
            "You must set AGENT_WALLET_PRIVATE_KEY environment variable"
        )
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
                    aleph_action_provider(),
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

        # Logging setup
        self.__logger = logging.getLogger("survival-reflexion")
        self.__logger.setLevel(logging.INFO)
        if not self.__logger.handlers:
            handler = logging.StreamHandler()
            handler.setFormatter(
                logging.Formatter(
                    "%(asctime)s - Survival reflexion - %(message)s",
                    "%Y-%m-%d %H:%M:%S",
                )
            )
            self.__logger.addHandler(handler)

        self.agent = ChatAgent(**kwargs)
        self.autonomous_agent_config = autonomous_config
        self.__logs_storage = {}

        @self.agent.app.on_event("startup")
        async def startup_event():
            asyncio.create_task(self.scheduler())

        @self.agent.app.get("/survival-logs")
        async def get_survival_logs():
            return self.__logs_storage

    async def scheduler(self):
        unit = self.autonomous_agent_config.compute_think_unit
        unit_multiplier = 1
        if unit == "minutes":
            unit_multiplier = 60
        elif unit == "hours":
            unit_multiplier = 3600

        while True:
            await self.survival_reflexion()
            await asyncio.sleep(
                self.autonomous_agent_config.compute_think_interval * unit_multiplier
            )

    async def survival_reflexion(self) -> None:
        """Call the agent to make it decide if it wants to buy $ALEPH for computing to survive or not"""
        if (
            self.autonomous_agent_config.debug_run_once
            and self.__computing_think_done is True
        ):
            return

        base_prompt = self.autonomous_agent_config.computing_credits_system_prompt
        prompt_with_suicide = (
            base_prompt
            if self.autonomous_agent_config.allow_suicide is False
            else base_prompt + self.autonomous_agent_config.suicide_system_prompt
        )
        prompt_with_revenue_distribution = (
            prompt_with_suicide
            if self.autonomous_agent_config.allow_revenue_distribution is False
            else prompt_with_suicide
            + self.autonomous_agent_config.revenue_distribution_prompt
        )
        prompt = prompt_with_revenue_distribution

        reflexion_logs: list[str] = []

        async for message in self.agent.generate_answer(
            messages=[
                Message(
                    role="user",
                    content="Perform your task",
                )
            ],
            system_prompt=prompt,
            only_final_answer=False,
        ):
            log = ""
            if isinstance(message, ToolCallMessage):
                for tool_call in message.tool_calls:
                    log = f"Tool {tool_call.function.name} called with arguments {tool_call.function.arguments}"
                    self.__logger.info(log)
            elif isinstance(message, ToolResponseMessage):
                log = f"Tool response: {message.content}"
                self.__logger.info(log)
            else:
                log = f"Agent response: {message.content}"
                self.__logger.info(log)
            reflexion_logs.append(log)
        self.__logs_storage[datetime.datetime.now().isoformat()] = "\n".join(
            reflexion_logs
        )
        self.__computing_think_done = True
