import AgentCard from "@/components/AgentCard";
import AgentDetails from "@/components/AgentDetails";
import PageContainer from "@/components/PageContainer";
import SidePanel from "@/components/SidePanel";
import { Button } from "@/components/ui/button";
import UploadAgentForm from "@/components/UploadAgentForm";
import useFetchAgents from "@/hooks/useFetchAgents";
import { Agent } from "@/types/agent";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter as useNavigationRouter } from "next/navigation";

export default function MarketplacePage() {
  const navigationRouter = useNavigationRouter();

  const { agents, isLoading: isLoadingAgents } = useFetchAgents();

  const [isMounted, setIsMounted] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent>();
  const [sidePanelContentType, setSidePanelContentType] = useState<
    "agent" | "upload-agent"
  >();

  const handleAgentCardClick = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
    setSidePanelContentType("agent");
  }, []);

  const handleSidePanelClose = useCallback(() => {
    setSidePanelContentType(undefined);
    setSelectedAgent(undefined);
  }, []);

  const handleUploadAgent = useCallback(() => {
    console.log("Upload agent");
    setSidePanelContentType("upload-agent");
  }, []);

  const handleDeployAgent = useCallback(
    (agent: Agent) => {
      navigationRouter.push(`/deploy/${agent.id}`);
    },
    [navigationRouter]
  );

  const sidePanelProps = useMemo(() => {
    switch (sidePanelContentType) {
      case "agent":
        return {
          title: "AI Agent Details",
          children: (
            <div className="flex flex-col gap-4">
              <AgentDetails agent={selectedAgent!} />
              <Button onClick={() => handleDeployAgent(selectedAgent!)}>
                Deploy Agent
              </Button>
            </div>
          ),
        };
      case "upload-agent":
        return {
          title: "Upload AI Agent",
          children: <UploadAgentForm />,
        };
      default:
        return { title: "Unkown", children: undefined };
    }
  }, [handleDeployAgent, selectedAgent, sidePanelContentType]);

  const isSidePanelOpen = useMemo(() => {
    return Boolean(sidePanelContentType);
  }, [sidePanelContentType]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <PageContainer>
      <div className="flex flex-wrap justify-center items-start gap-12">
        {isLoadingAgents
          ? Array.from({ length: 10 }).map((_, index) => (
              <AgentCard key={index} loading={true} agent={undefined} />
            ))
          : agents.map((agent) => (
              <AgentCard
                loading={false}
                key={agent.id}
                agent={agent}
                onClick={handleAgentCardClick}
              />
            ))}
      </div>
      <div className="flex justify-center mt-10">
        <Button onClick={handleUploadAgent}>Upload AI Agent</Button>
      </div>
      {isMounted && (
        <SidePanel
          isOpen={isSidePanelOpen}
          onClose={handleSidePanelClose}
          {...sidePanelProps}
        />
      )}
    </PageContainer>
  );
}
