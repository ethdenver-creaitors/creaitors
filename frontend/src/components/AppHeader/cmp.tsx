import Image from "next/image";
import AccountButton from "../AccountButton";
import { usePathname, useRouter as useNavigationRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import useBreakpoints from "@/hooks/breakpoints/useBreakpoints";
import { NavigationLink } from "./styles";
import { GoogleLogin } from "@react-oauth/google";
import { getAccount, getPortfolio, useOkto } from "@okto_web3/react-sdk";
import toast from "react-hot-toast";
import LoginDropdown from "@/components/ui/login-dropdown";
import { WalletModal } from "@coinbase/onchainkit/wallet";
import { useAccount } from "wagmi";

export default function AppHeader() {
	const navigationRouter = useNavigationRouter();
	const pathname = usePathname();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const { isDesktop } = useBreakpoints();
	const oktoClient = useOkto();
	const [isOnchainkitModalOpen, setIsOnchainkitModalOpen] = useState(false);
	const { isConnected: isWagmiConnected } = useAccount();

	const mobileDropdownMenuRef = useRef<HTMLDivElement>(null);

	const isActive = useCallback((path: string) => pathname === path, [pathname]);

	const navigationLinks = useMemo(() => {
		return [
			{ name: "Home", path: "/" },
			{ name: "Marketplace", path: "/marketplace/" },
		];
	}, []);

	// Close the menu when switching to desktop
	useEffect(() => {
		if (isDesktop) setIsMenuOpen(false);
	}, [isDesktop]);

	// Close menu when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (!mobileDropdownMenuRef.current) return;
			if (mobileDropdownMenuRef.current.contains(event.target as Node)) return;

			setIsMenuOpen(false);
		};

		if (isMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isMenuOpen]);

	// eslint-disable-next-line
	async function handleGoogleLogin(credentialResponse: any) {
		try {
			console.log(credentialResponse);
			await toast.promise(
				oktoClient.loginUsingOAuth({
					idToken: credentialResponse.credential,
					provider: "google",
				}),
				{
					loading: "Connecting with Google",
					success: "Successfully connected",
					error: "An error occurred during the connection",
				},
			);

			const userAccounts = await getAccount(oktoClient);
			console.log(userAccounts);
			const userPortfolio = await getPortfolio(oktoClient);
			console.log(userPortfolio);

			// const transferParams = {
			// 	amount: BigInt("1000000000000000"), // 0.001 ETH
			// 	recipient: "0x7569b2C9294BB79744E5d201F5fCA42Dc02d7A9f" as `0x${string}`,
			// 	token: "" as `0x${string}`, // Empty string for native token
			// 	caip2Id: "eip155:8453", // Base chain ID
			// };
			// const jobId = await toast.promise(tokenTransfer(oktoClient, transferParams), {
			// 	loading: "Sending transaction",
			// 	error: "Transaction failed",
			// 	success: "Transaction success",
			// });
			// console.log(`Transfer jobId! Result: ${jobId}`);
		} catch (error) {
			console.error("Authentication error:", error);
		}
	}

	return (
		<section className="z-30 bg-background fixed w-full min-h-[var(--header-height)] flex items-center px-6 border-b-2 shadow-[0_0_10px_hsl(var(--foreground))]">
			{isDesktop ? (
				<div className="flex items-center justify-between w-full px-2 gap-3 h-[var(--header-height-desktop)]">
					<div className="flex items-center gap-4 cursor-pointer" onClick={() => navigationRouter.push("/")}>
						<Image src="/logo.webp" alt="Logo" width={0} height={0} className="h-20 w-auto" />
						<h1 className="text-6xl font-accent gradient-primary-light font-bold">CreAItors</h1>
					</div>
					<div className="flex items-center gap-6">
						{/* Navigation Links */}
						<div className="flex items-center gap-6">
							{navigationLinks.map(({ name, path }) => (
								<NavigationLink key={path} $isActive={isActive(path)} href={path}>
									{name}
								</NavigationLink>
							))}
						</div>
						<div className="hidden">
							<GoogleLogin onSuccess={handleGoogleLogin} />
						</div>

						{/*TODO: also check if octo is connected to show custom button*/}
						{!isWagmiConnected ? (
							<LoginDropdown
								handleGoogleLogin={() =>
									(document.querySelector(".nsm7Bb-HzV7m-LgbsSe-MJoBVe") as HTMLButtonElement).click()
								}
								handleWalletLogin={() => setIsOnchainkitModalOpen(true)}
							/>
						) : (
							<AccountButton />
						)}
						<WalletModal isOpen={isOnchainkitModalOpen} onClose={() => setIsOnchainkitModalOpen(false)} />
					</div>
				</div>
			) : (
				<>
					<div className="flex items-center justify-between w-full px-2 gap-3">
						<button onClick={() => setIsMenuOpen(!isMenuOpen)}>
							{isMenuOpen ? <X size={28} /> : <Menu size={28} />}
						</button>

						<div
							className="absolute left-1/2 transform -translate-x-1/2 cursor-pointer"
							onClick={() => navigationRouter.push("/")}
						>
							<Image src="/logo.webp" alt="Logo" width={0} height={0} className="h-14 w-auto" />
						</div>

						<AccountButton withName={false} />
					</div>
					{isMenuOpen && (
						<div
							ref={mobileDropdownMenuRef} // Attach ref to menu container
							className="absolute top-full bg-background left-0 w-full shadow-md border-t-2"
						>
							<nav className="flex flex-col p-4 space-y-4">
								{navigationLinks.map(({ name, path }) => (
									<NavigationLink
										key={path}
										$isActive={isActive(path)}
										href={path}
										onClick={() => setIsMenuOpen(false)}
									>
										{name}
									</NavigationLink>
								))}
							</nav>
						</div>
					)}
				</>
			)}
		</section>
	);
}
