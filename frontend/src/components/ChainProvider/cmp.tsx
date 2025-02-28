"use client";

import { AppConfig, OnchainKitProvider } from "@coinbase/onchainkit";
import { base } from "wagmi/chains";

export type ChainProviderProps = {
	children: React.ReactNode;
};

export default function ChainProvider({ children }: Readonly<ChainProviderProps>) {
	const config: AppConfig = {
		appearance: {
			name: "CreAItors",
			logo: "https://raw.githubusercontent.com/ethdenver-creaitors/creaitors/refs/heads/main/.github/assets/logo.webp",
			mode: "auto",
			theme: "hacker",
		},
		wallet: {
			display: "modal",
			termsUrl: "https://...",
			privacyUrl: "https://...",
		},
	};

	return (
		<OnchainKitProvider apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY} chain={base} config={config}>
			{children}
		</OnchainKitProvider>
	);
}
