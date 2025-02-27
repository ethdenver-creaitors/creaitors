from copy import deepcopy
from decimal import Decimal
from enum import Enum
from typing import Optional, Dict

from uuid import UUID

from pydantic import BaseModel


class AgentDeploymentStatus(Enum):
    PENDING_FUND = "PENDING_FUND"
    PENDING_ALLOCATION = "PENDING_ALLOCATION"
    PENDING_START = "PENDING_START"
    PENDING_DEPLOY = "PENDING_DEPLOY"
    ALIVE = "ALIVE"


class AgentRequest(BaseModel):
    agent_id: UUID
    agent_key: str
    agent_hash: str
    owner: str
    name: str | None = None
    env_variables: Dict[str, str] = {}


class PublicAgentDeployment(BaseModel):
    id: str
    name: str
    owner: str
    wallet_address: str
    required_tokens: Decimal
    instance_hash: str | None
    agent_hash: str
    last_update: int
    status: AgentDeploymentStatus


class AgentDeployment(PublicAgentDeployment):
    tags: list[str]


class FetchedAgentDeployment(AgentDeployment):
    post_hash: Optional[str]
    instance_ip: str | None

    def to_message(self):
        message = deepcopy(self)
        message.post_hash = None
        return message


class CRNInfo(BaseModel):
    url: str
    hash: str
    receiver_address: str


class HostNotFoundError(Exception):
    pass
