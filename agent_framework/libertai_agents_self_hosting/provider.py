from typing import Any

from coinbase_agentkit import ActionProvider, EvmWalletProvider, create_action
from coinbase_agentkit.network import Network
from pydantic import BaseModel
from web3 import Web3


class GetAlephCloudTokens(BaseModel):
    eth_amount: float


UNISWAP_ROUTER_ADDRESS = Web3.to_checksum_address(
    "0x2626664c2603336E57B271c5C0b26F421741e481"
)

SWAP_ROUTER_ABI = [
    {
        "inputs": [
            {
                "components": [
                    {"internalType": "address", "name": "tokenIn", "type": "address"},
                    {"internalType": "address", "name": "tokenOut", "type": "address"},
                    {"internalType": "uint24", "name": "fee", "type": "uint24"},
                    {"internalType": "address", "name": "recipient", "type": "address"},
                    {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
                    {
                        "internalType": "uint256",
                        "name": "amountOutMinimum",
                        "type": "uint256",
                    },
                    {
                        "internalType": "uint160",
                        "name": "sqrtPriceLimitX96",
                        "type": "uint160",
                    },
                ],
                "internalType": "struct IV3SwapRouter.ExactInputSingleParams",
                "name": "params",
                "type": "tuple",
            }
        ],
        "name": "exactInputSingle",
        "outputs": [
            {"internalType": "uint256", "name": "amountOut", "type": "uint256"}
        ],
        "stateMutability": "payable",
        "type": "function",
    }
]


class AlephConvertionProvider(ActionProvider[EvmWalletProvider]):
    def __init__(self):
        super().__init__("aleph-conversion-provider", [])

    @create_action(
        name="get-aleph-cloud-tokens",
        description="Convert some ETH to ALEPH to pay for your computing",
        schema=GetAlephCloudTokens,
    )
    def get_aleph_cloud_tokens(
        self, wallet_provider: EvmWalletProvider, args: dict[str, Any]
    ) -> dict[str, Any]:
        contract = Web3().eth.contract(
            address=UNISWAP_ROUTER_ADDRESS, abi=SWAP_ROUTER_ABI
        )
        address = wallet_provider.get_address()

        # Token Addresses (on Base)
        WETH_ADDRESS = Web3.to_checksum_address(
            "0x4200000000000000000000000000000000000006"
        )
        ALEPH_ADDRESS = Web3.to_checksum_address(
            "0xc0Fbc4967259786C743361a5885ef49380473dCF"
        )

        # Fee Tier (1%)
        FEE_TIER = 10000

        # Amount to swap
        amount_in_wei = Web3.to_wei(0.0001, "ether")

        # Deadline
        deadline = (
            Web3(Web3.HTTPProvider("https://mainnet.base.org")).eth.get_block("latest")[
                "timestamp"
            ]
            + 600
        )  # 10 minutes from now

        # Transaction Data (Using exactInputSingle)
        tx = contract.functions.exactInputSingle(
            {
                "tokenIn": WETH_ADDRESS,
                "tokenOut": ALEPH_ADDRESS,
                "fee": FEE_TIER,
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
                "nonce": Web3(
                    Web3.HTTPProvider("https://mainnet.base.org")
                ).eth.get_transaction_count(address),
                "chainId": 8453,  # Base Mainnet
            }
        )
        tx_hash = wallet_provider.send_transaction(tx)
        receipt = wallet_provider.wait_for_transaction_receipt(tx_hash)
        return receipt

    def supports_network(self, network: Network) -> bool:
        # Only works on Base
        return network.chain_id == "8453"


def aleph_convertion_action_provider() -> AlephConvertionProvider:
    """Create a new instance of the AlephConvertion action provider.

    Returns:
        A new AlephConvertion action provider instance.

    """
    return AlephConvertionProvider()
