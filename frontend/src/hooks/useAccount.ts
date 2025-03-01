import { googleDisconnect } from "@/store/reducers/connectionSlice";
import { AppState } from "@/store/store";
import { getAccount, useOkto } from "@okto_web3/react-sdk";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { base } from "viem/chains";
import { useBalance, useDisconnect, useAccount as useWagmiAccount } from "wagmi";

export default function useAccount() {
	const [address, setAddress] = useState<string>();

	const oktoClient = useOkto();
	const { googleCredential } = useSelector((state: AppState) => state.connection);
	const isOktoConnected = useMemo(() => !!googleCredential, [googleCredential]);

	const wagmiAccount = useWagmiAccount();
	const { disconnect: wagmiDisconnect, connectors: wagmiConnectors } = useDisconnect();
	const balance = useBalance({ address: address as `0x${string}`, chainId: base.id });

	const dispatch = useDispatch();

	const handleDisconnect = useCallback(() => {
		if (isOktoConnected) {
			oktoClient.sessionClear();
			setAddress(undefined);
			dispatch(googleDisconnect());
		} else {
			wagmiConnectors.map((connector) => wagmiDisconnect({ connector }));
		}
	}, [dispatch, isOktoConnected, oktoClient, wagmiConnectors, wagmiDisconnect]);

	useEffect(() => {
		const getAddress = async () => {
			if (isOktoConnected) {
				const userAccounts = await getAccount(oktoClient);

				setAddress(userAccounts[0].address);
			} else {
				setAddress(wagmiAccount.address);
			}
		};

		getAddress();
	}, [isOktoConnected, oktoClient, wagmiAccount]);

	return {
		address,
		balance: balance.data,
		handleDisconnect,
	};
}
