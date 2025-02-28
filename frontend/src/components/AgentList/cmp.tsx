import { useState, useMemo } from "react";
import { SearchIcon } from "lucide-react";
import AgentCard from "@/components/AgentCard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { agentCategories } from "@/utils/constants";
import { Agent } from "@/types/agent";

export type AgentListProps = {
	agents: Agent[];
	isLoadingAgents: boolean;
	onAgentCardClick: (agent: Agent) => void;
};

export default function AgentList({ agents, isLoadingAgents, onAgentCardClick: handleAgentCardClick }: AgentListProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("All");

	const allAgentCategories = useMemo(() => ["All", ...agentCategories], []);

	const filteredAgents = useMemo(() => {
		return agents.filter((agent) => {
			const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesCategory = selectedCategory === "All" || agent.category === selectedCategory;

			return matchesSearch && matchesCategory;
		});
	}, [agents, searchQuery, selectedCategory]);

	return (
		<>
			{/* Search & Filters */}
			<div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10">
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
					Array.from({ length: 8 }).map((_, index) => <AgentCard key={index} isLoadingAgent={true} />)
				) : filteredAgents.length > 0 ? (
					filteredAgents.map((agent) => (
						<AgentCard key={agent.id} agent={agent} onClick={handleAgentCardClick} isLoadingAgent={false} />
					))
				) : (
					<p className="text-center col-span-full text-gray-500">No agents found</p>
				)}
			</div>
		</>
	);
}
