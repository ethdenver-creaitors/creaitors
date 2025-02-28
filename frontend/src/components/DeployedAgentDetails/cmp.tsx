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
import { useBalance, useSignMessage } from "wagmi";
import { Separator } from "../ui/separator";
import { agentsApiServer } from "@/utils/constants";

export type DeployedAgentDetailsProps = {
	deployedAgent: DeployedAgent;
	updateAgentDetails: (agentId: string) => void;
};

export default function DeployedAgentDetails({ deployedAgent, updateAgentDetails }: DeployedAgentDetailsProps) {
	const steps = useMemo(
		() => ({
			[DeployedAgentStatus.PENDING_FUND]: {
				order: 1,
				name: "Pending funds",
				description: "Pending funds in agent wallet",
			},
			[DeployedAgentStatus.PENDING_SWAP]: {
				order: 2,
				name: "Pending Swap",
				description: "Agent instance is swaping for computing tokens",
			},
			[DeployedAgentStatus.PENDING_ALLOCATION]: {
				order: 3,
				name: "Allocating",
				description: "Agent instance is waiting for allocation",
			},
			[DeployedAgentStatus.PENDING_START]: {
				order: 4,
				name: "Starting",
				description: "Agent instance is starting",
			},
			[DeployedAgentStatus.PENDING_DEPLOY]: {
				order: 5,
				name: "Deploying",
				description: "Agent is being deployed",
			},
			[DeployedAgentStatus.ALIVE]: {
				order: 6,
				name: "Alive",
				description: "Agent is alive",
			},
		}),
		[],
	);

	const currentStep = useMemo(() => steps[deployedAgent.status], [steps, deployedAgent]);

	const agentBalance = useBalance({
		address: deployedAgent.wallet_address,
	});

	const agentWalletBalance = useMemo(() => {
		if (!agentBalance.data) return 0;

		const { value, decimals } = agentBalance.data;

		return Number(value) / 10 ** decimals;
	}, [agentBalance]);

	const isAgentWalletFunded = useMemo(() => {
		return agentWalletBalance >= deployedAgent.required_tokens;
	}, [agentWalletBalance, deployedAgent]);

	const { signMessageAsync } = useSignMessage();

	const handleFinishFundWalletStep = useCallback(async () => {
		const unsignedAgentKey = `SIGN AGENT ${deployedAgent.owner} ${deployedAgent.id}`;
		const signedAgentKey = await signMessageAsync({
			message: unsignedAgentKey,
		});

		const requestBody = {
			name: deployedAgent.name,
			agent_id: deployedAgent.id,
			agent_hash: deployedAgent.agent_hash,
			owner: deployedAgent.owner,
			agent_key: signedAgentKey,
		};

		console.log("requestBody", requestBody);

		// return;

		const response = await fetch(`${agentsApiServer}/agent/deploy`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		});

		const data = await response.json();

		console.log("data", data);

		updateAgentDetails(deployedAgent.id);
	}, [deployedAgent, signMessageAsync, updateAgentDetails]);

	const AgentWallet = useMemo(() => {
		return (
			<Identity address={deployedAgent.wallet_address} chain={base} className="w-fit py-4">
				<Address isSliced={false} className="italic" />
				<EthBalance className="font-bold mr-2" />
			</Identity>
		);
	}, [deployedAgent]);

	const fundTransactionAmount = useMemo(
		() => deployedAgent.required_tokens - agentWalletBalance,
		[deployedAgent, agentWalletBalance],
	);

	const fundTransactionCall = useMemo(() => {
		return {
			to: deployedAgent.wallet_address,
			value: BigInt(Math.floor(fundTransactionAmount * 10 ** 18)),
		};
	}, [deployedAgent, fundTransactionAmount]);

	console.log("fundTransactionAmount", fundTransactionAmount);

	const StepContent = useMemo(() => {
		switch (deployedAgent.status) {
			case "PENDING_FUND":
				return (
					<div className="space-y-4">
						<p>
							In order to make the AI Agent start working its wallet needs a minimum funds of{" "}
							<strong>{deployedAgent.required_tokens} ETH</strong>
						</p>
						<div className="space-y-2">
							<p className="font-bold text-xl">AI Agent Wallet</p>
							<div className="flex flex-wrap items-center gap-x-8 gap-y-4">
								{AgentWallet}
								<Transaction className="flex-1" calls={[fundTransactionCall]} chainId={base.id}>
									<TransactionButton text={`Fund ${fundTransactionAmount} ETH to AI Agent`} className="w-fit" />
									<TransactionToast>
										<TransactionToastIcon />
										<TransactionToastLabel />
										<TransactionToastAction />
									</TransactionToast>
								</Transaction>
							</div>
						</div>
						<Button
							// disabled={!isAgentWalletFunded}
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
						<div className="flex flex-wrap items-center gap-x-8 gap-y-4">{AgentWallet}</div>
						<Button
							// disabled={!isAgentWalletFunded}
							onClick={handleFinishFundWalletStep}
						>
							Continue
						</Button>
					</>
				);
			default:
				return (
					<>
						<p className="font-bold text-xl">AI Agent Wallet</p>
						<div className="flex flex-wrap items-center gap-x-8 gap-y-4">{AgentWallet}</div>
						<Button
							// disabled={!isAgentWalletFunded}
							onClick={handleFinishFundWalletStep}
						>
							Continue
						</Button>
					</>
				);
		}
	}, [AgentWallet, deployedAgent, fundTransactionAmount, fundTransactionCall, handleFinishFundWalletStep]);

	return (
		<>
			<div className="flex items-start gap-2">
				<p className="font-extrabold text-5xl">{currentStep.name}</p>
				{deployedAgent.status !== "ALIVE" && <p className="text-2xl">[Step {currentStep.order} of 5]</p>}
			</div>
			<p className="italic">{currentStep.description}</p>
			<Separator />
			{StepContent}
		</>
	);
}
