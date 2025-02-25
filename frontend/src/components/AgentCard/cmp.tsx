import Image from "next/image";
import { Skeleton } from "../ui/skeleton";
import { Agent } from "@/types/agent";

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

export type AgentCardProps = {
  agent: Agent;
  onClick: (agent: Agent) => void;
};

export default function AgentCard({
  agent,
  onClick: handleClick,
}: AgentCardProps) {
  return (
    <div
      className="w-48 flex flex-col items-center justify-center px-0.5 cursor-pointer"
      onClick={() => handleClick(agent)}
    >
      <div className="relative h-48 w-48 rounded-t-xl mb-0.5">
        <Image
          src={agent.image}
          alt="Agent image"
          className={`min-h-full w-full object-cover rounded-t-xl`}
          width={0}
          height={0}
        />
        <div className="absolute -bottom-0.5 left-0 right-0 h-1/3 bg-gradient-to-t from-background to-transparent" />
      </div>
      <div className="text-md text-left flex gap-x-4 w-full justify-between">
        <div>{agent.name}</div>
      </div>
    </div>
  );
}
