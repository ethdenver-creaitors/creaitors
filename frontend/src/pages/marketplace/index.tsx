import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter as useNavigationRouter } from "next/navigation";
import { Plus, SearchIcon } from "lucide-react";
import AgentCard from "@/components/AgentCard";
import AgentDetails from "@/components/AgentDetails";
import PageContainer from "@/components/PageContainer";
import SidePanel from "@/components/SidePanel";
import { Button } from "@/components/ui/button";
import UploadAgentForm from "@/components/UploadAgentForm";
import useFetchAgents from "@/hooks/useFetchAgents";
import { Agent } from "@/types/agent";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { agentCategories } from "@/utils/constants";

export default function MarketplacePage() {
	const navigationRouter = useNavigationRouter();
	const { agents, isLoading: isLoadingAgents } = useFetchAgents();

	const [isMounted, setIsMounted] = useState(false);
	const [selectedAgent, setSelectedAgent] = useState<Agent>();
	const [sidePanelContentType, setSidePanelContentType] = useState<"agent" | "upload-agent">();
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("All");

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

	const handleDeployAgent = useCallback(
		(agent: Agent) => {
			navigationRouter.push(`/deploy/${agent.id}`);
		},
		[navigationRouter],
	);

	const allAgentCategories = useMemo(() => ["All", ...agentCategories], []);

	const filteredAgents = useMemo(() => {
		return agents.filter((agent) => {
			const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesCategory = selectedCategory === "All" || agent.category === selectedCategory;
			return matchesSearch && matchesCategory;
		});
	}, [agents, searchQuery, selectedCategory]);

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

			{/* Search & Filters */}
			<div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
				<div className="flex items-center w-full max-w-sm space-x-2 rounded-lg border border-foreground-300 bg-gray-50 px-3.5 py-2">
					<SearchIcon className="h-4 w-4" />
					<Input
						type="search"
						placeholder="Search"
						className="w-full border-0 h-8 font-semibold"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>

				<div className="flex flex-wrap items-center justify-center gap-2 overflow-x-auto">
					{allAgentCategories.map((category) => (
						<Badge
							key={category}
							variant={selectedCategory === category ? "default" : "outline"}
							className="cursor-pointer"
							onClick={() => setSelectedCategory(category)}
						>
							{category}
						</Badge>
					))}
				</div>
			</div>

			{/* Agents Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-24 mb-12">
				{isLoadingAgents ? (
					Array.from({ length: 10 }).map((_, index) => <AgentCard key={index} loading={true} />)
				) : filteredAgents.length > 0 ? (
					filteredAgents.map((agent) => (
						<AgentCard key={agent.id} agent={agent} onClick={handleAgentCardClick} loading={false} />
					))
				) : (
					<p className="text-center col-span-full text-gray-500">No agents found</p>
				)}
			</div>

			{/* Floating Upload Button */}
			<div className="fixed bottom-6 right-6">
				<Button size="lg" className="rounded-full px-4 py-6 font-extrabold" onClick={handleUploadAgent}>
					<Plus size={20} />
					Upload AI Agent
				</Button>
			</div>

			{/* Side Panel */}
			{isMounted && (
				<SidePanel
					isOpen={!!sidePanelContentType}
					onClose={handleSidePanelClose}
					title={sidePanelContentType === "agent" ? "AI Agent Details" : "Upload AI Agent"}
				>
					{sidePanelContentType === "agent" ? (
						<div className="flex flex-col gap-4">
							<AgentDetails agent={selectedAgent!} />
							<Button onClick={() => handleDeployAgent(selectedAgent!)}>Deploy Agent</Button>
						</div>
					) : (
						<UploadAgentForm />
					)}
				</SidePanel>
			)}
		</PageContainer>
	);
}
