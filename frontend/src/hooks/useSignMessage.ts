import toast from "react-hot-toast";
import { useSignMessage as wagmiUseSignMessage } from "wagmi";

export default function useSignMessage() {
	const { signMessageAsync } = wagmiUseSignMessage();

	const signMessage = async (message: string) => {
		return await toast.promise(signMessageAsync({ message }), {
			loading: "Signing message...",
			success: "Message signed successfully",
			error: "Error signing message",
		});
	};

	return { signMessage };
}
