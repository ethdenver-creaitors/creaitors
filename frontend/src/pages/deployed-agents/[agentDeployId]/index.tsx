import AgentDetails from "@/components/AgentDetails";
import DeployedAgentDetails from "@/components/DeployedAgentDetails";
import PageContainer from "@/components/PageContainer";
import { Separator } from "@/components/ui/separator";
import useFetchAgents from "@/hooks/useFetchAgents";
import { DeployedAgent, DeployedAgentStatus } from "@/types/agent";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

export type ConfigureAgentDeployFormValues = {
  name?: string;
  agentId?: string;
  agentHash?: string;
  owner?: string;
};

export default function DeployAgentsPage() {
  const router = useRouter();
  const {
    query: { agentDeployId },
  } = router;

  const [deployedAgent, setDeployedAgent] = useState<DeployedAgent>();

  useEffect(() => {
    let timerId: NodeJS.Timeout;

    const fetchData = async () => {
      if (!agentDeployId) return;

      const response = await fetch(`/api/agent/${agentDeployId}`);
      const data = await response.json();
      setDeployedAgent(data);

      // If no user action is required, schedule the next poll in 5 seconds
      if (
        ![DeployedAgentStatus.ALIVE, DeployedAgentStatus.PENDING_FUND].includes(
          data.status
        )
      )
        timerId = setTimeout(fetchData, 5000);
    };

    fetchData();

    return () => clearTimeout(timerId);
  }, [agentDeployId]);

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
          <DeployedAgentDetails deployedAgent={deployedAgent} />
          {/* <Form {...form}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormMessage />
                  <FormControl>
                    <Input placeholder="My AI Agent" {...field} />
                  </FormControl>
                  <FormDescription>
                    Used to easily identify your running agent
                  </FormDescription>
                </FormItem>
              )}
            />
            <Button type="submit">Submit</Button>
          </form>
        </Form> */}
        </div>
      </div>
    </PageContainer>
  );
}
