import React, { useEffect, useState } from "react";
import {
	ConnectWallet,
	ConnectWalletText,
	Wallet,
	WalletDropdown,
	WalletDropdownDisconnect,
	WalletDropdownLink,
} from "@coinbase/onchainkit/wallet";

import { Address, Avatar, EthBalance, Identity, Name } from "@coinbase/onchainkit/identity";

import { Bot, LogOut, User } from "lucide-react";
// import { useOkto } from "@okto_web3/react-sdk";
import { useSelector } from "react-redux";
import { AppState } from "@/store/store";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { Button } from "../ui/button";
import { useRouter as useNavigationRouter } from "next/navigation";
import useAccount from "@/hooks/useAccount";
import Ethereum from "../Logos/ethereum";

export default function AccountButton({ withName = true }: Readonly<{ withName?: boolean }>) {
	// const oktoClient = useOkto();
	const navigationRouter = useNavigationRouter();
	const { googleCredential } = useSelector((state: AppState) => state.connection);

	useEffect(() => {
		console.log("googleCredential", googleCredential);
	}, [googleCredential]);

	const [isOpen, setIsOpen] = useState(false);

	const { address, balance, handleDisconnect } = useAccount();

	// return <></>;
	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" className="flex items-center gap-2">
					<User className="h-4 w-4" />
					<span className="font-semibold">{address}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56 p-1">
				<DropdownMenuItem className="flex items-center gap-2 py-3 px-2 m-1 rounded-md transition-colors duration-200 hover:bg-accent/50">
					<Ethereum />
					{Number(balance?.formatted || 0).toFixed(5)} ETH
				</DropdownMenuItem>
				<DropdownMenuItem
					className="flex items-center gap-2 cursor-pointer py-3 px-2 m-1 rounded-md transition-colors duration-200 hover:bg-accent/50"
					onClick={() => {
						navigationRouter.push("/deployed-agents");
					}}
				>
					<Bot />
					My AI agents
				</DropdownMenuItem>
				<DropdownMenuItem
					className="flex items-center gap-2 cursor-pointer py-3 px-2 m-1 rounded-md transition-colors duration-200 hover:bg-accent/50"
					onClick={handleDisconnect}
				>
					<LogOut className="h-4 w-4" />
					Disconnect
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);

	return (
		<Wallet address="0x1234567890abcdef1234567890abcdef12345678">
			<ConnectWallet address="0x1234567890abcdef1234567890abcdef12345678">
				<ConnectWalletText address="0x1234567890abcdef1234567890abcdef12345678">Connect</ConnectWalletText>
				<Avatar address="0x1234567890abcdef1234567890abcdef12345678" className="h-6 w-6" />
				{withName && <Name address="0x1234567890abcdef1234567890abcdef12345678" />}
			</ConnectWallet>
			<WalletDropdown address="0x1234567890abcdef1234567890abcdef12345678">
				<Identity className="px-4 pt-3 pb-2">
					<Avatar address="0x1234567890abcdef1234567890abcdef12345678" />
					<Name address="0x1234567890abcdef1234567890abcdef12345678" />
					<Address address="0x1234567890abcdef1234567890abcdef12345678" />
					<EthBalance address="0x1234567890abcdef1234567890abcdef12345678" />
				</Identity>
				{/* @ts-expect-error: There's a missconfiguration on the types for WalletDropdownLink */}
				<WalletDropdownLink icon={<Bot />} href="/deployed-agents">
					My AI agents
				</WalletDropdownLink>
				<WalletDropdownDisconnect />
			</WalletDropdown>
		</Wallet>
	);
}
