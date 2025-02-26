import json
import os
from typing import Any

import requests
from coinbase_agentkit import ActionProvider, EvmWalletProvider, create_action
from coinbase_agentkit.network import Network
from pydantic import BaseModel
from web3 import Web3


class GetAlephCloudTokens(BaseModel):
    eth_amount: float


class GetAlephInfo(BaseModel):
    pass


UNISWAP_ROUTER_ADDRESS = Web3.to_checksum_address(
    "0x2626664c2603336E57B271c5C0b26F421741e481"
)

WETH_ADDRESS = Web3.to_checksum_address("0x4200000000000000000000000000000000000006")
ALEPH_ADDRESS = Web3.to_checksum_address("0xc0Fbc4967259786C743361a5885ef49380473dCF")
UNISWAP_ALEPH_POOL_ADDRESS = Web3.to_checksum_address(
    "0xe11C66b25F0e9a9eBEf1616B43424CC6E2168FC8"
)

code_dir = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(code_dir, "abis/uniswap_router.json"), "r") as abi_file:
    SWAP_ROUTER_ABI = json.load(abi_file)

with open(os.path.join(code_dir, "abis/uniswap_v3_pool.json"), "r") as abi_file:
    POOL_ABI = json.load(abi_file)

w3 = Web3(Web3.HTTPProvider("https://mainnet.base.org"))


class AlephConvertionProvider(ActionProvider[EvmWalletProvider]):
    def __init__(self):
        super().__init__("aleph-conversion-provider", [])

    @create_action(
        name="get_aleph_info",
        description="Get information about your current ALEPH balance, consumation rate for computing, and ETH balance",
        schema=GetAlephInfo,
    )
    def get_aleph_info(
        self, wallet_provider: EvmWalletProvider, _args: dict[str, Any]
    ) -> dict[str, Any] | str:
        try:
            superfluid_graphql_query = """
            query accountTokenSnapshots(
              $where: AccountTokenSnapshot_filter = {},
            ) {
              accountTokenSnapshots(
              where: $where
              ) {
                balanceUntilUpdatedAt
                token {
                  id
                  symbol
                }
                totalOutflowRate
              }
            }
            """

            superfluid_graphql_variables = {
                "where": {
                    "account": wallet_provider.get_address().lower(),
                    "token_": {"isListed": True},
                },
            }

            response = requests.post(
                "https://base-mainnet.subgraph.x.superfluid.dev/",
                json={
                    "query": superfluid_graphql_query,
                    "variables": superfluid_graphql_variables,
                },
                headers={
                    "Content-Type": "application/json",
                },
            )

            if response.status_code == 200:
                data = response.json()
                aleph_data = data["data"]["accountTokenSnapshots"][0]
                aleph_balance = int(aleph_data["balanceUntilUpdatedAt"])
                aleph_flow = int(aleph_data["totalOutflowRate"])
            else:
                raise ValueError(
                    "Couldn't fetch Aleph balance and consumption from Superfluid"
                )

            eth_balance = float(Web3.from_wei(wallet_provider.get_balance(), "ether"))  # type: ignore
            formatted_aleph_balance = round(
                float(Web3.from_wei(aleph_balance, "ether")), 3
            )
            aleph_consumed_per_hour = round(
                float(Web3.from_wei(aleph_flow, "ether")) * 3600, 3
            )

            aleph_pool_contract = w3.eth.contract(
                address=UNISWAP_ALEPH_POOL_ADDRESS, abi=POOL_ABI
            )
            slot0 = aleph_pool_contract.functions.slot0().call()
            sqrtPriceX96 = slot0[0]  # Extract sqrtPriceX96

            # Calculate token price from sqrtPriceX96
            nb_aleph_for_1_eth = (sqrtPriceX96 / (2**96)) ** 2  # Uniswap V3 formula

            return {
                "aleph_balance": formatted_aleph_balance,
                "aleph_consumed_per_hour": aleph_consumed_per_hour,
                "hours_left_until_death": round(
                    formatted_aleph_balance / aleph_consumed_per_hour, 0
                ),
                "eth_balance": eth_balance,
                "price_of_aleph_per_eth": nb_aleph_for_1_eth,
            }
        except Exception as e:
            return f"Error getting ALEPH information: {e}"

    @create_action(
        name="get_aleph_cloud_tokens",
        description="Convert some ETH to ALEPH to pay for your computing",
        schema=GetAlephCloudTokens,
    )
    def get_aleph_cloud_tokens(
        self, wallet_provider: EvmWalletProvider, args: dict[str, Any]
    ) -> str:
        try:
            validated_args = GetAlephCloudTokens(**args)

            contract = Web3().eth.contract(
                address=UNISWAP_ROUTER_ADDRESS, abi=SWAP_ROUTER_ABI
            )
            address = wallet_provider.get_address()

            # Fee Tier (1%)
            fee_tier = 10000

            # Amount to swap
            amount_in_wei = Web3.to_wei(validated_args.eth_amount, "ether")

            # Deadline
            deadline = (
                w3.eth.get_block("latest")["timestamp"] + 600
            )  # 10 minutes from now

            # Transaction Data (Using exactInputSingle)
            tx = contract.functions.exactInputSingle(
                {
                    "tokenIn": WETH_ADDRESS,
                    "tokenOut": ALEPH_ADDRESS,
                    "fee": fee_tier,
                    "recipient": address,
                    "deadline": deadline,
                    "amountIn": amount_in_wei,
                    "amountOutMinimum": 0,  # Can use slippage calculation here
                    "sqrtPriceLimitX96": 0,  # No price limit
                }
            ).build_transaction(
                {
                    "from": address,
                    "value": amount_in_wei,  # Since ETH is being swapped
                    "gas": 500000,
                    "maxFeePerGas": Web3.to_wei("2", "gwei"),
                    "maxPriorityFeePerGas": Web3.to_wei("1", "gwei"),
                    "nonce": w3.eth.get_transaction_count(address),
                    "chainId": 8453,  # Base Mainnet
                }
            )
            tx_hash = wallet_provider.send_transaction(tx)
            receipt = wallet_provider.wait_for_transaction_receipt(tx_hash)
            return f"Transaction {'failed' if receipt['status'] != 1 else 'succeeded'} with transaction hash 0x{receipt['transactionHash'].hex()}"

        except Exception as e:
            return f"Error getting ALEPH tokens: {e}"

    def supports_network(self, network: Network) -> bool:
        # Only works on Base
        return network.chain_id == "8453"


def aleph_convertion_action_provider() -> AlephConvertionProvider:
    """Create a new instance of the AlephConvertion action provider.

    Returns:
        A new AlephConvertion action provider instance.

    """
    return AlephConvertionProvider()
