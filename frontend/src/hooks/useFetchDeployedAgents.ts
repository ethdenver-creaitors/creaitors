import { Agent } from "@/types/agent";
import { useEffect, useState } from "react";
import { MessageType } from "@aleph-sdk/message";
import { AppState } from "@/store/store";
import { useSelector } from "react-redux";
import { useAccount } from "wagmi";

export type UseFetchAgentsReturn = {
	agents: Agent[];
	isLoading: boolean;
};

export default function useFetchDeployedAgents(): UseFetchAgentsReturn {
	const { alephClient } = useSelector((state: AppState) => state.aleph);
	const [isLoading, setIsLoading] = useState(true);
	const [agents, setAgents] = useState<Agent[]>([]);
	const { address: userAddress, isConnected } = useAccount();

	useEffect(() => {
		const fetchAgents = async () => {
			setIsLoading(true);

			try {
				if (!isConnected) return;

				const agentsResponse = await alephClient.getPosts({
					channels: ["test-creaitors"],
					types: "test-creaitors-agent",
				});

				const deployedAgentsResponse = await alephClient.getPosts({
					channels: ["creaitors"],
					types: "creaitors-agent-deployment",
				});

				const userDeployedAgents = deployedAgentsResponse.posts.filter(
					({ content: { owner } }) => owner === userAddress,
				);

				const parsedAgents = await Promise.all(
					userDeployedAgents.map(async ({ content: { id, agent_hash, name } }) => {
						const agent = agentsResponse.posts.find(({ item_hash }) => item_hash === agent_hash);

						if (!agent) return;

						const {
							content: { image, description, source_code_hash, category },
						} = agent;
						const imageStoreMessage = await alephClient.getMessage<MessageType.store>(image);

						const {
							content: { item_hash: imageCID },
						} = imageStoreMessage;

						return {
							id,
							image: `https://ipfs.aleph.im/ipfs/${imageCID}`,
							name: name,
							description: description,
							source_code_hash: source_code_hash,
							category: category,
						} as Agent;
					}),
				);

				setAgents(parsedAgents.filter((agent) => agent !== undefined));
			} catch (error) {
				console.error(error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchAgents();
	}, [alephClient, isConnected, userAddress]);

	return {
		agents,
		isLoading,
	};
}
