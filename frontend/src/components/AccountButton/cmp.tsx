import React, { useState } from "react";
import { Bot, LogOut, User, Copy } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { Button } from "../ui/button";
import { useRouter as useNavigationRouter } from "next/navigation";
import useAccount from "@/hooks/useAccount";
import Ethereum from "../Logos/ethereum";
import { ellipseString } from "@/lib/utils";
import useBreakpoints from "@/hooks/breakpoints/useBreakpoints";
import toast from "react-hot-toast";
import { Separator } from "../ui/separator";

export default function AccountButton() {
	const { isDesktop } = useBreakpoints();
	const navigationRouter = useNavigationRouter();
	const { address, balance, handleDisconnect } = useAccount();

	const [isOpen, setIsOpen] = useState(false);

	const handleCopy = () => {
		if (address) {
			navigator.clipboard.writeText(address);
			toast.success("Address copied to clipboard");
		}
	};

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<Button variant={isDesktop ? "outline" : "ghost"} className="flex items-center gap-2">
					<User className="h-4 w-4" />
					{isDesktop && <span className="font-semibold">{ellipseString(address)}</span>}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56 p-1">
				<DropdownMenuItem
					className="flex items-center justify-center gap-2 cursor-pointer py-3 px-2 m-1 rounded-md transition-colors duration-200 hover:bg-accent/50"
					onClick={handleCopy}
				>
					<span className="font-semibold">{ellipseString(address, 8)}</span>
					<Copy className="h-4 w-4" />
				</DropdownMenuItem>
				<DropdownMenuItem className="flex items-center justify-center  gap-2 py-3 px-2 m-1 rounded-md">
					<Ethereum />
					{Number(balance?.formatted || 0).toFixed(5)} ETH
				</DropdownMenuItem>
				<div className="px-4">
					<Separator />
				</div>
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
}
