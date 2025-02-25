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

    class Config:
        arbitrary_types_allowed = True
