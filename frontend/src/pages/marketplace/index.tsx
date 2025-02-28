import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter as useNavigationRouter } from "next/navigation";
import { Plus } from "lucide-react";
import AgentDetails from "@/components/AgentDetails";
import PageContainer from "@/components/PageContainer";
import SidePanel from "@/components/SidePanel";
import { Button } from "@/components/ui/button";
import UploadAgentForm from "@/components/UploadAgentForm";
import useFetchAgents from "@/hooks/useFetchAgents";
import { Agent } from "@/types/agent";
import AgentList from "@/components/AgentList";

export default function MarketplacePage() {
	const navigationRouter = useNavigationRouter();
	const { agents, isLoading, fetchAgents } = useFetchAgents();

	const [isMounted, setIsMounted] = useState(false);
	const [selectedAgent, setSelectedAgent] = useState<Agent>();
	const [sidePanelContentType, setSidePanelContentType] = useState<"agent" | "upload-agent">();

	const isLoadingAgents = useMemo(() => !agents && isLoading, [agents, isLoading]);

	const handleAgentCardClick = useCallback((agent: Agent) => {
		setSelectedAgent(agent);
		setSidePanelContentType("agent");
	}, []);

	const handleSidePanelClose = useCallback(() => {
		setSidePanelContentType(undefined);
		setSelectedAgent(undefined);
	}, []);

	const handleUploadAgent = useCallback(() => {
		setSidePanelContentType("upload-agent");
	}, []);

	const handleUploadAgentSuccess = useCallback(() => {
		handleSidePanelClose();
		fetchAgents();
	}, [fetchAgents, handleSidePanelClose]);

	const handleDeployAgent = useCallback(
		(agent: Agent) => {
			navigationRouter.push(`/deploy/${agent.id}`);
		},
		[navigationRouter],
	);

	const sidePanelContent = useMemo(() => {
		switch (sidePanelContentType) {
			case "agent":
				return {
					title: "AI Agent Details",
					element: (
						<div className="flex flex-col gap-4">
							<AgentDetails agent={selectedAgent!} />
							<Button onClick={() => handleDeployAgent(selectedAgent!)}>Deploy Agent</Button>
						</div>
					),
				};
			case "upload-agent":
				return { title: "Upload AI Agent", element: <UploadAgentForm onUploadSuccess={handleUploadAgentSuccess} /> };
			default:
				return { title: "Unknown", element: null };
		}
	}, [sidePanelContentType, selectedAgent, handleUploadAgentSuccess, handleDeployAgent]);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	return (
		<PageContainer>
			{/* Header */}
			<div className="mb-6 text-center">
				<h1 className="text-3xl font-bold">AI Agent Marketplace</h1>
				<p className="text-gray-500">Explore and deploy cutting-edge AI agents</p>
			</div>

			{/* Agent List with search filters */}
			<AgentList agents={agents} isLoadingAgents={isLoadingAgents} onAgentCardClick={handleAgentCardClick} />

			{/* Floating Upload Button */}
			<div className="fixed bottom-6 right-6">
				<Button size="lg" className="rounded-full px-4 py-6 font-extrabold" onClick={handleUploadAgent}>
					<Plus size={20} />
					Upload AI Agent
				</Button>
			</div>

			{/* Side Panel */}
			{isMounted && (
				<SidePanel isOpen={!!sidePanelContentType} onClose={handleSidePanelClose} title={sidePanelContent.title}>
					{sidePanelContent.element}
				</SidePanel>
			)}
		</PageContainer>
	);
}
