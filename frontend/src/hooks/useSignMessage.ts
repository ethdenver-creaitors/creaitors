import { useOkto } from "@okto_web3/react-sdk";
import { useCallback } from "react";
import toast from "react-hot-toast";
import { useSignMessage as wagmiUseSignMessage } from "wagmi";

export default function useSignMessage() {
	const { signMessage: oktoSignMessage } = useOkto();
	const { signMessageAsync: wagmiSignMessage } = wagmiUseSignMessage();

	const notify = useCallback(async (f: Promise<unknown> | (() => Promise<unknown>)) => {
		return toast.promise(f, {
			loading: "Signing message...",
			success: "Message signed successfully",
			error: "Error signing message",
		});
	}, []);

	const signMessage = useCallback(
		async (message: string) => {
			if (oktoSignMessage) {
				return await notify(oktoSignMessage(message));
			} else {
				return await notify(wagmiSignMessage({ message }));
			}
		},
		[notify, oktoSignMessage, wagmiSignMessage],
	);

	return { signMessage };
}
