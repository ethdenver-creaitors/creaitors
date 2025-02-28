import { Agent } from "@/types/agent";
import Image from "next/image";
import { Badge } from "../ui/badge";
import useCachedImage from "@/hooks/useCachedImage";

export type AgentDetailsProps = {
	agent: Agent;
};

export default function AgentDetails({ agent }: AgentDetailsProps) {
	const cachedImage = useCachedImage(agent?.image);

	return (
		<div className="flex gap-4">
			<div className="w-full lg:max-w-[50%]">
				<Image
					src={cachedImage || agent.image}
					alt="Agent image"
					className={`min-h-full w-full object-cover rounded-xl`}
					width={0}
					height={0}
				/>
			</div>
			<div className="flex flex-col gap-2">
				<div className="font-extrabold text-3xl">{agent.name}</div>
				{agent.category && (
					<div>
						<Badge>{agent.category}</Badge>
					</div>
				)}
				<div>{agent.description}</div>
			</div>
		</div>
	);
}
