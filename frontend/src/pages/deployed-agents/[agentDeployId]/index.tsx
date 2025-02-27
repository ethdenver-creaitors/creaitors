import AgentDetails from "@/components/AgentDetails";
import DeployedAgentDetails from "@/components/DeployedAgentDetails";
import PageContainer from "@/components/PageContainer";
import { Separator } from "@/components/ui/separator";
import useFetchAgents from "@/hooks/useFetchAgents";
import { DeployedAgent, DeployedAgentStatus } from "@/types/agent";
import { agentsApiServer } from "@/utils/constants";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";

export type ConfigureAgentDeployFormValues = {
  name?: string;
  agentId?: string;
  agentHash?: string;
  owner?: string;
};

export default function DeployAgentsPage() {
  const router = useRouter();
  const {
    query: { agentDeployId: agentDeployIdRaw },
  } = router;

  const agentDeployId = useMemo(
    () => agentDeployIdRaw as string,
    [agentDeployIdRaw]
  );

  const [deployedAgent, setDeployedAgent] = useState<DeployedAgent>();

  const handleFetchDeployedAgent = useCallback(async (id: string) => {
    const response = await fetch(`${agentsApiServer}/agent/${id}`);
    const data = await response.json();

    console.log("fetched deployed agent", data);

    setDeployedAgent(data);
  }, []);

  const requiresUserAction = useCallback((agent: DeployedAgent) => {
    if (!agent) return false;

    return [
      DeployedAgentStatus.ALIVE,
      DeployedAgentStatus.PENDING_FUND,
    ].includes(agent.status);
  }, []);

  // If no user action is required, schedule the next poll in 5 seconds
  useEffect(() => {
    if (!deployedAgent) return;

    let timerId: NodeJS.Timeout;
    if (!requiresUserAction(deployedAgent)) {
      timerId = setTimeout(
        () => handleFetchDeployedAgent(deployedAgent.id),
        5000
      );
    }

    return () => clearTimeout(timerId);
  }, [deployedAgent, requiresUserAction, handleFetchDeployedAgent]);

  useEffect(() => {
    if (!agentDeployId) return;

    handleFetchDeployedAgent(agentDeployId);
  }, [agentDeployId, handleFetchDeployedAgent]);

  const { agents, isLoading: isLoadingAgents } = useFetchAgents();

  const agent = useMemo(() => {
    if (!deployedAgent) return;
    if (!agents) return;

    return agents.find((agent) => agent.id === deployedAgent.agent_hash);
  }, [agents, deployedAgent]);

  if (isLoadingAgents) return <div>Loading...</div>;
  if (!deployedAgent) return <div>Deployment not found</div>;
  if (!agent) return <div>Agent not found</div>;

  return (
    <PageContainer>
      <div className="flex gap-8">
        <div className="flex max-w-[33%]">
          <div className="flex flex-col gap-4 ">
            <p className="font-extrabold text-5xl">{deployedAgent.name}</p>
            <AgentDetails agent={agent} />
          </div>
          <Separator orientation="vertical" className="w-1" />
        </div>
        <div className="flex flex-col gap-4 w-full">
          <DeployedAgentDetails
            deployedAgent={deployedAgent}
            updateAgentDetails={handleFetchDeployedAgent}
          />
        </div>
      </div>
    </PageContainer>
  );
}
