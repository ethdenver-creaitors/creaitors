import { useEffect } from "react";
import { useAccount, useChainId, useConfig } from "wagmi";
import { useDispatch } from "react-redux";
import { getEthersProvider } from "@/lib/utils";
import { getAccountFromProvider } from "@aleph-sdk/base";
import { connect, disconnect } from "@/store/reducers/alephSlice";

export default function WalletEventsListener() {
	const { address, isConnected } = useAccount();
	const chainId = useChainId();
	const wagmiConfig = useConfig();

	const dispatch = useDispatch();

	useEffect(() => {
		const updateAlephState = async () => {
			// If there's no connected wallet, clear the Aleph state.
			if (!isConnected || !address) return dispatch(disconnect());

			// Get an ethers provider for the current chain
			const provider = await getEthersProvider(wagmiConfig, { chainId });

			// Retrieve the Aleph account from the provider
			const alephAccount = await getAccountFromProvider(provider);

			// Update the Redux store
			dispatch(connect(alephAccount));
		};

		updateAlephState();
	}, [address, isConnected, chainId, wagmiConfig, dispatch]);

	return null;
}
