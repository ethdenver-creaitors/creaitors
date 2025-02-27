import json
import os
from decimal import Decimal

from aleph.sdk.chains.ethereum import ETHAccount
from aleph.sdk.exceptions import InsufficientFundsError
from aleph.sdk.types import TokenType

from eth_account import Account
from eth_account.account import LocalAccount
from web3 import Web3

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


def convert_aleph_to_eth(required_tokens: Decimal) -> Decimal:
    aleph_pool_contract = w3.eth.contract(
        address=UNISWAP_ALEPH_POOL_ADDRESS, abi=POOL_ABI
    )
    slot0 = aleph_pool_contract.functions.slot0().call()
    sqrt_price_x96 = slot0[0]  # Extract sqrtPriceX96

    # Calculate token price from sqrtPriceX96
    nb_aleph_for_1_eth = Decimal((sqrt_price_x96 / (2**96)) ** 2)  # Uniswap V3 formula
    required_eth_tokens = required_tokens / nb_aleph_for_1_eth
    print(f"This {required_tokens} $ALEPH are {required_eth_tokens} $ETH tokens")

    return required_eth_tokens


def make_eth_to_aleph_conversion(aleph_account: ETHAccount, required_eth_tokens: Decimal) -> str:
    contract = w3.eth.contract(
        address=UNISWAP_ROUTER_ADDRESS, abi=SWAP_ROUTER_ABI
    )

    account: LocalAccount = Account.from_key(aleph_account.export_private_key())
    address = account.address

    # Fee Tier (1%)
    fee_tier = 10000

    # Amount to swap
    amount_in_wei = w3.to_wei(required_eth_tokens, "ether")

    # Fetch current base fee from the latest block
    latest_block = w3.eth.get_block('latest')
    base_fee = latest_block['baseFeePerGas']

    # Set priority fee (tip to miners)
    priority_fee = Web3.to_wei(2, 'gwei')  # Adjust based on network congestion

    # Calculate max fee (base fee + priority fee)
    max_fee = base_fee + priority_fee

    # Transaction Data (Using exactInputSingle)
    tx = contract.functions.exactInputSingle(
        {
            "tokenIn": WETH_ADDRESS,
            "tokenOut": ALEPH_ADDRESS,
            "fee": fee_tier,
            "recipient": address,
            "amountIn": amount_in_wei,
            "amountOutMinimum": 0,  # Can use slippage calculation here
            "sqrtPriceLimitX96": 0,  # No price limit
        }
    ).build_transaction(
        {
            "from": address,
            "value": amount_in_wei,  # Since ETH is being swapped
            "gas": 1000000,
            'maxFeePerGas': max_fee,
            'maxPriorityFeePerGas': priority_fee,
            "nonce": w3.eth.get_transaction_count(address),
            "chainId": 8453,  # Base Mainnet
        }
    )

    # First simulate the transaction
    try:
        w3.eth.call(tx)
    except Exception as e:
        print(f"Error in TX simulation: {e}")
        raise ValueError(print(f"Error in TX simulation: {e}"))

    signed_transaction = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed_transaction.rawTransaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    print(f"Transaction {'failed' if receipt['status'] != 1 else 'succeeded'}"
          f" with transaction hash {receipt['transactionHash'].hex()}")
    return str(receipt['transactionHash'].hex())


CUSTOM_MIN_ETH_BALANCE = 0.0005  # Require only $1 of ETH for gas fees
CUSTOM_MIN_ETH_BALANCE_WEI = w3.to_wei(Decimal(CUSTOM_MIN_ETH_BALANCE), "ether")


class CustomETHAccount(ETHAccount):
    def can_transact(self, block=True) -> bool:
        balance = self.get_eth_balance()
        valid = balance > CUSTOM_MIN_ETH_BALANCE_WEI if self.chain else False
        if not valid and block:
            raise InsufficientFundsError(
                token_type=TokenType.GAS,
                required_funds=CUSTOM_MIN_ETH_BALANCE,
                available_funds=float(w3.from_wei(int(balance), "ether")),
            )
        return valid