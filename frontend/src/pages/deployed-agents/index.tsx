import { useCallback } from "react";
import { useRouter as useNavigationRouter } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import { Agent } from "@/types/agent";
import useFetchDeployedAgents from "@/hooks/useFetchDeployedAgents";
import AgentList from "@/components/AgentList";

export default function MarketplacePage() {
	const navigationRouter = useNavigationRouter();
	const { agents, isLoading: isLoadingAgents } = useFetchDeployedAgents();

	const handleAgentCardClick = useCallback(
		(agent: Agent) => {
			navigationRouter.push(`/deployed-agents/${agent.id}`);
		},
		[navigationRouter],
	);

	return (
		<PageContainer>
			{/* Header */}
			<div className="mb-6 text-center">
				<h1 className="text-3xl font-bold">My deployed agents</h1>
			</div>

			{/* Agent List with search filters */}
			<AgentList agents={agents} isLoadingAgents={isLoadingAgents} onAgentCardClick={handleAgentCardClick} />
		</PageContainer>
	);
}
