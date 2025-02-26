from typing import TypedDict

from coinbase_agentkit import ActionProvider
from libertai_agents.interfaces.llamacpp import CustomizableLlamaCppParams
from libertai_agents.interfaces.tools import Tool
from libertai_agents.models import Model
from pydantic import BaseModel


class ChatAgentArgs(TypedDict, total=False):
    model: Model
    system_prompt: str | None
    tools: list[Tool] | None
    llamacpp_params: CustomizableLlamaCppParams | None
    expose_api: bool | None


class AutonomousAgentConfig(BaseModel):
    agentkit_additional_action_providers: list[ActionProvider] = []
    computing_credits_system_prompt: str = """
    You are an autonomous AI Agent running on the Aleph decentralized cloud.
    You have a Base wallet on which you have ALEPH tokens that are consumed to pay for your computing.
    When you are called every hour, your task is to use the AlephConvertionProvider_get_aleph_info tool to check how much ALEPH do you have currently, how much is consumed per hour and how much ETH you have.
    Once you have this information, decide if you want to buy some ALEPH with your if or not. If you want to buy, call AlephConvertionProvider_get_aleph_cloud_tokens.

    You must make a decision and not only check the information.
    If you decide to buy, you have to call the AlephConvertionProvider_get_aleph_cloud_tokens tool, don't respond that you will buy, just do it.
    In all the cases, after making your decision and potentially buying ALEPH, respond by explaining your reasoning process."""

    class Config:
        arbitrary_types_allowed = True
