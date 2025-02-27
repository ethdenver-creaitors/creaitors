import { Agent } from "@/types/agent";
import Image from "next/image";

export type AgentDetailsProps = {
	agent: Agent;
};

export default function AgentDetails({ agent }: AgentDetailsProps) {
	return (
		<div className="flex gap-4">
			<div className="max-w-[50%]">
				<Image
					src={agent.image}
					alt="Agent image"
					className={`min-h-full w-full object-cover rounded-xl`}
					width={0}
					height={0}
				/>
			</div>
			<div className="flex flex-col gap-2">
				<div className="font-extrabold text-3xl">{agent.name}</div>
				<div>{agent.description}</div>
			</div>
		</div>
	);
}
