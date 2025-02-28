import { Agent } from "@/types/agent";
import { useCallback, useEffect, useState } from "react";
import { MessageType } from "@aleph-sdk/message";
import { AppState } from "@/store/store";
import { useSelector } from "react-redux";

export type UseFetchAgentsReturn = {
	agents: Agent[];
	isLoading: boolean;
	fetchAgents: () => Promise<void>;
};

export default function useFetchAgents(): UseFetchAgentsReturn {
	const { alephClient } = useSelector((state: AppState) => state.aleph);
	const [isLoading, setIsLoading] = useState(true);
	const [agents, setAgents] = useState<Agent[]>([]);

	const fetchAgents = useCallback(async () => {
		setIsLoading(true);

		try {
			const response = await alephClient.getPosts({
				channels: ["test-creaitors"],
				types: "test-creaitors-agent",
			});

			const parsedAgents = await Promise.all(
				response.posts.map(async ({ item_hash, content }) => {
					const imageStoreMessage = await alephClient.getMessage<MessageType.store>(content.image);

					const {
						content: { item_hash: imageCID },
					} = imageStoreMessage;

					return {
						id: item_hash,
						image: `https://ipfs.aleph.im/ipfs/${imageCID}`,
						name: content.name,
						description: content.description,
						source_code_hash: content.source_code_hash,
						category: content.category,
					} as Agent;
				}),
			);

			setAgents(parsedAgents);
		} catch (error) {
			console.error(error);
		} finally {
			setIsLoading(false);
		}
	}, [alephClient]);

	useEffect(() => {
		fetchAgents();
	}, [fetchAgents]);

	return {
		agents,
		isLoading,
		fetchAgents,
	};
}
