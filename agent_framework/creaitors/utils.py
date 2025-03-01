from coinbase_agentkit import Action, ActionProvider, WalletProvider
from langchain_core.tools import StructuredTool


def get_provider_langchain_tools(
    agent_kit_action_provider: ActionProvider, wallet_provider: WalletProvider
) -> list[StructuredTool]:
    """Get Langchain tools from an AgentKit action provider.

    Args:
        agent_kit_action_provider: The AgentKit action provider
        wallet_provider: The wallet to link to those actions

    Returns:
        A list of Langchain tools

    """
    actions: list[Action] = agent_kit_action_provider.get_actions(wallet_provider)

    tools = []
    for action in actions:

        def create_tool_fn(action=action):
            def tool_fn(**kwargs) -> str:
                return action.invoke(kwargs)

            return tool_fn

        tool = StructuredTool(
            name=action.name,
            description=action.description,
            func=create_tool_fn(action),
            args_schema=action.args_schema,
        )
        tools.append(tool)

    return tools
