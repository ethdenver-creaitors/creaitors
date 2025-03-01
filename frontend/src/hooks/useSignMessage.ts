import { AppState } from "@/store/store";
import { useOkto } from "@okto_web3/react-sdk";
import { useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { useSignMessage as wagmiUseSignMessage } from "wagmi";

export default function useSignMessage() {
	const { googleCredential } = useSelector((state: AppState) => state.connection);

	const oktoClient = useOkto();
	const { signMessageAsync: wagmiSignMessage } = wagmiUseSignMessage();

	const isOktoConnected = useMemo(() => !!googleCredential, [googleCredential]);

	const notify = useCallback(async (f: Promise<unknown> | (() => Promise<unknown>)) => {
		return toast.promise(f, {
			loading: "Signing message...",
			success: "Message signed successfully",
			error: "Error signing message",
		});
	}, []);

	const signMessage = useCallback(
		async (message: string) => {
			if (isOktoConnected) {
				return await notify(oktoClient.signMessage(message));
			} else {
				return await notify(wagmiSignMessage({ message }));
			}
		},
		[isOktoConnected, notify, oktoClient, wagmiSignMessage],
	);

	return { signMessage };
}
