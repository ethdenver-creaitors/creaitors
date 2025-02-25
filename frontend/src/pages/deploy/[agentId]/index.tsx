import AgentDetails from "@/components/AgentDetails";
import { Separator } from "@/components/ui/separator";
import useFetchAgents from "@/hooks/useFetchAgents";
import { useRouter } from "next/router";
import { useMemo } from "react";

export default function DeployAgentPage() {
  const router = useRouter();
  const {
    query: { agentId },
  } = router;

  const { agents, loading } = useFetchAgents();

  const agent = useMemo(
    () => agents.find((agent) => agent.id === agentId),
    [agents, agentId]
  );

  if (!agent) return <div>Agent not found</div>;
  return (
    <div className="flex gap-8 mx-8">
      <div className="flex max-w-[33%]">
        <div className="flex flex-col gap-4 ">
          <p className="font-extrabold text-5xl">Selected Agent</p>
          <AgentDetails agent={agent} />
        </div>
        <Separator orientation="vertical" className="w-1" />
      </div>
      <div className="h-full"></div>
      <div className="flex flex-col gap-4 max-w-[66%]">
        <p className="font-extrabold text-5xl">Deploy Agent</p>
        <div>Deploy form</div>
      </div>
    </div>
  );
}
