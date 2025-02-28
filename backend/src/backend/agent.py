from http import HTTPStatus

from fastapi import HTTPException
from typing import List, Optional, Dict

from aleph.sdk import AlephHttpClient
from aleph.sdk.query.filters import PostFilter

from .config import config
from .models import FetchedAgentDeployment


async def fetch_agents(
        ids: list[str] | None = None,
        addresses: Optional[List[str]] = None
) -> list[FetchedAgentDeployment]:
    if not addresses:
        addresses = []

    async with AlephHttpClient(api_server=config.ALEPH_API_URL) as client:
        result = await client.get_posts(
            post_filter=PostFilter(
                types=[config.ALEPH_AGENT_DEPLOYMENT_POST_TYPE],
                addresses=addresses,
                tags=ids,
                channels=[config.ALEPH_CHANNEL],
            )
        )
    return [
        FetchedAgentDeployment(**post.content, post_hash=post.original_item_hash)
        for post in result.posts
    ]


async def get_agent(agent_id: str, check_result: bool = True) -> Optional[FetchedAgentDeployment]:
    agents = await fetch_agents([agent_id])

    if not check_result:
        if len(agents) == 0:
            return None

    if len(agents) < 1:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail=f"Agent with ID {agent_id} not found.",
        )

    if len(agents) > 1:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail=f"Some agents with ID {agent_id} found.",
        )

    return agents[0]


def generate_fixed_env_variables(private_key: str, creator_address: str, owner_address: str) -> str:
    content = f"AGENT_WALLET_PRIVATE_KEY={private_key}\n"
    content += f"PLATFORM_REWARD_ADDRESS={config.PLATFORM_REWARD_ADDRESS}\n"
    content += f"CREAITOR_REWARD_ADDRESS={creator_address}\n"
    content += f"OWNER_REWARD_ADDRESS={owner_address}\n"
    return content


def generate_env_file_content(injected_content: str, env_variables: Optional[Dict[str, str]] = None) -> bytes:
    content = injected_content
    if env_variables:
        for name, value in env_variables.items():
            content += f"{name}={value}"

    return content.encode("utf-8")




