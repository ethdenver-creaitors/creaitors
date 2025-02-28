import Image from "next/image";
import { Skeleton } from "../ui/skeleton";
import { Agent } from "@/types/agent";
import { useState } from "react";
import { StyledAgentCard } from "./styles";
import { Badge } from "../ui/badge";
import useCachedImage from "@/hooks/useCachedImage";

export function AgentCardSkeleton() {
	return (
		<div className="w-48 flex flex-col items-center justify-center px-0.5">
			<Skeleton className="relative h-48 w-48 rounded-t-xl mb-0.5" />
			<div className="text-xs text-left flex gap-x-4 w-full justify-between">
				<div className="text-md text-left flex gap-x-4 w-full justify-between">
					<Skeleton className="h-[1em] w-5/6" />
				</div>
			</div>
		</div>
	);
}

type AgentCardLoadingProps = {
	isLoadingAgent: true;
	agent?: never;
	onClick?: never;
};

type AgentCardLoadedProps = {
	isLoadingAgent: false;
	agent: Agent;
	onClick: (agent: Agent) => void;
};

export type AgentCardProps = AgentCardLoadingProps | AgentCardLoadedProps;

export default function AgentCard({ isLoadingAgent, agent, onClick: handleClick }: AgentCardProps) {
	const cachedImage = useCachedImage(agent?.image);

	const [isImageLoading, setIsImageLoading] = useState(true);

	return (
		<div className="flex flex-col items-center justify-center px-0.5">
			<StyledAgentCard $clickable={!!handleClick} onClick={() => handleClick && handleClick(agent)}>
				<div className="relative h-48 w-48 rounded-t-xl mb-0.5 group">
					{!isLoadingAgent && (
						<Image
							src={cachedImage || agent.image}
							alt="Agent image"
							className="absolute min-h-full w-full object-cover rounded-xl"
							width={0}
							height={0}
							onLoadingComplete={() => setIsImageLoading(false)}
						/>
					)}
					{(isImageLoading || isLoadingAgent) && <Skeleton className="absolute h-full w-full rounded-xl" />}
					<div className="absolute rounded-xl bottom-0 left-0 right-0 h-1/3 group-hover:h-3/5 bg-gradient-to-t from-secondary/50 group-hover:from-secondary/70 to-transparent transition-all" />
					<div className="pt-48 flex w-full justify-between mt-0.5">
						<div className="text-md text-left flex gap-x-4 justify-between w-full">
							{isLoadingAgent ? (
								<div className="w-full space-y-1">
									<Skeleton className="h-[1.2em] w-full" />
									<Skeleton className="h-[1.2em] w-2/3" />
								</div>
							) : (
								<div>{agent.name}</div>
							)}
						</div>
						<div className="flex justify-end w-full">
							{isLoadingAgent ? (
								<Skeleton className="h-[1.2em] w-2/3" />
							) : (
								agent?.category && <Badge className="hover:bg-primar h-fit text-center">{agent.category}</Badge>
							)}
						</div>
					</div>
				</div>
			</StyledAgentCard>
		</div>
	);
}
