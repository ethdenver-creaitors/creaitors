import React from "react";
import {
	ConnectWallet,
	ConnectWalletText,
	Wallet,
	WalletDropdown,
	WalletDropdownDisconnect,
	WalletDropdownLink,
} from "@coinbase/onchainkit/wallet";

import { Address, Avatar, EthBalance, Identity, Name } from "@coinbase/onchainkit/identity";

import { Bot } from "lucide-react";

export default function AccountButton({ withName = true }: Readonly<{ withName?: boolean }>) {
	return (
		<Wallet>
			<ConnectWallet>
				<ConnectWalletText>Connect</ConnectWalletText>
				<Avatar className="h-6 w-6" />
				{withName && <Name />}
			</ConnectWallet>
			<WalletDropdown>
				<Identity className="px-4 pt-3 pb-2">
					<Avatar />
					<Name />
					<Address />
					<EthBalance />
				</Identity>
				{/* @ts-expect-error: There's a missconfiguration on the types for WalletDropdownLink */}
				<WalletDropdownLink icon={<Bot />} href="/deployed-agents">
					My agents
				</WalletDropdownLink>
				<WalletDropdownLink icon="wallet" href="https://keys.coinbase.com" target="_blank">
					Wallet
				</WalletDropdownLink>
				<WalletDropdownDisconnect />
			</WalletDropdown>
		</Wallet>
	);
}
