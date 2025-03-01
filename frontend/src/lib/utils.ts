import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Account, Chain, Client, Transport } from "viem";
import { type Config, getConnectorClient } from "@wagmi/core";
import { providers } from "ethers";
import { base } from "viem/chains";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function clientToProvider(client: Client<Transport, Chain, Account>) {
	const { chain, transport } = client;
	const network = {
		chainId: chain.id,
		name: chain.name,
		ensAddress: chain.contracts?.ensRegistry?.address,
	};
	return new providers.Web3Provider(transport, network);
}

/** Action to convert a Viem Client to an ethers.js Web3Provider. */
export async function getEthersProvider(config: Config, { chainId }: { chainId?: number } = { chainId: base.id }) {
	const client = await getConnectorClient(config, { chainId });
	return clientToProvider(client);
}

export function ellipseString(str?: string, charsPerSide: number = 5): string {
	if (!str) return "";
	// If the string is short enough, return it unchanged
	if (str.length <= charsPerSide * 2) return str;

	// Extract the first 5 characters and the last 5 characters
	const firstPart = str.slice(0, charsPerSide);
	const lastPart = str.slice(-charsPerSide);

	// Combine them with an ellipsis in between
	return `${firstPart}...${lastPart}`;
}
