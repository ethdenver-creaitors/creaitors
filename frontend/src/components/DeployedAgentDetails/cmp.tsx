import { DeployedAgent, DeployedAgentStatus } from "@/types/agent";
import { Address, EthBalance, Identity } from "@coinbase/onchainkit/identity";

import {
  Transaction,
  TransactionButton,
  TransactionToast,
  TransactionToastAction,
  TransactionToastIcon,
  TransactionToastLabel,
} from "@coinbase/onchainkit/transaction";
import { useCallback, useMemo } from "react";
import { base } from "viem/chains";
import { Button } from "../ui/button";
import { useBalance } from "wagmi";
import { Separator } from "../ui/separator";

export type DeployedAgentDetailsProps = {
  deployedAgent: DeployedAgent;
};

export default function DeployedAgentDetails({
  deployedAgent,
}: DeployedAgentDetailsProps) {
  const steps = useMemo(
    () => ({
      [DeployedAgentStatus.PENDING_FUND]: {
        order: 1,
        name: "Pending funds",
        description: "Pending funds in agent wallet",
      },
      [DeployedAgentStatus.PENDING_ALLOCATION]: {
        order: 2,
        name: "Allocating",
        description: "Agent instance is waiting for allocation",
      },
      [DeployedAgentStatus.PENDING_START]: {
        order: 3,
        name: "Starting",
        description: "Agent instance is starting",
      },
      [DeployedAgentStatus.PENDING_DEPLOY]: {
        order: 4,
        name: "Deploying",
        description: "Agent is being deployed",
      },
      [DeployedAgentStatus.ALIVE]: {
        order: 5,
        name: "Alive",
        description: "Agent is alive",
      },
    }),
    []
  );

  const currentStep = useMemo(
    () => steps[deployedAgent.status],
    [steps, deployedAgent]
  );

  const agentBalance = useBalance({
    address: deployedAgent.wallet_address,
  });

  const isAgentWalletFunded = useMemo(() => {
    if (!agentBalance.data) return false;

    const { value, decimals } = agentBalance.data;

    return (
      Number(value) / 10 ** decimals >=
      Number(deployedAgent.min_required_tokens)
    );
  }, [agentBalance.data, deployedAgent.min_required_tokens]);

  const handleFinishFundWalletStep = useCallback(async () => {
    const response = await fetch(`/api/agent/${deployedAgent.id}/deploy`);

    const data = await response.json();

    console.log("data", data);
  }, [deployedAgent]);

  const AgentWallet = useMemo(() => {
    return (
      <Identity
        address={deployedAgent.wallet_address}
        chain={base}
        className="w-fit py-4"
      >
        <Address isSliced={false} className="italic" />
        <EthBalance className="font-bold mr-2" />
      </Identity>
    );
  }, [deployedAgent]);

  const StepContent = useMemo(() => {
    switch (deployedAgent.status) {
      case "PENDING_FUND":
        return (
          <div className="space-y-4">
            <p>
              In order to make the AI Agent start working its wallet needs a
              minimum funds of{" "}
              <strong>{deployedAgent.min_required_tokens} ETH</strong>
            </p>
            <div className="space-y-2">
              <p className="font-bold text-xl">AI Agent Wallet</p>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                {AgentWallet}
                <Transaction
                  className="flex-1"
                  calls={[
                    {
                      to: deployedAgent.wallet_address,
                      value: BigInt(
                        Number(deployedAgent.min_required_tokens) * 10 ** 18
                      ),
                    },
                  ]}
                  chainId={base.id}
                >
                  <TransactionButton text="Fund AI Agent" className="w-fit" />
                  <TransactionToast>
                    <TransactionToastIcon />
                    <TransactionToastLabel />
                    <TransactionToastAction />
                  </TransactionToast>
                </Transaction>
              </div>
            </div>
            <Button
              disabled={!isAgentWalletFunded}
              onClick={handleFinishFundWalletStep}
            >
              Continue
            </Button>
          </div>
        );
      case "ALIVE":
        return (
          <>
            <p className="font-bold text-xl">AI Agent Wallet</p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              {AgentWallet}
            </div>
          </>
        );
      default:
        return (
          <>
            <p className="font-bold text-xl">AI Agent Wallet</p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              {AgentWallet}
            </div>
          </>
        );
    }
  }, [
    AgentWallet,
    deployedAgent,
    handleFinishFundWalletStep,
    isAgentWalletFunded,
  ]);

  return (
    <>
      <div className="flex items-start gap-2">
        <p className="font-extrabold text-5xl">{currentStep.name}</p>
        <p className="text-2xl">[Step {currentStep.order} of 5]</p>
      </div>
      <p className="italic">{currentStep.description}</p>
      <Separator />
      {StepContent}
    </>
  );
}
