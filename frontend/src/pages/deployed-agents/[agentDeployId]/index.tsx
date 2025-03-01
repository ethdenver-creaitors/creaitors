import PageContainer from "@/components/PageContainer";
import useFetchAgents from "@/hooks/useFetchAgents";
import { DeployedAgent, DeployedAgentStatus } from "@/types/agent";
import { agentsApiServer } from "@/utils/constants";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader } from "@/components/loader";
import CreaitorsClient from "@/lib/creaitorsClient";
import useCachedImage from "@/hooks/useCachedImage";
import Image from "next/image";
import { Address, EthBalance, Identity } from "@coinbase/onchainkit/identity";
import { base } from "viem/chains";
import StepProgressIndicator from "@/components/StepProgressIndicator";
import {
	Transaction,
	TransactionButton,
	TransactionToast,
	TransactionToastAction,
	TransactionToastIcon,
	TransactionToastLabel,
} from "@coinbase/onchainkit/transaction";
import { useBalance } from "wagmi";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import useSignMessage from "@/hooks/useSignMessage";
import toast from "react-hot-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";

export type ConfigureAgentDeployFormValues = {
	name?: string;
	agentId?: string;
	agentHash?: string;
	owner?: string;
	env_variables: { [key: string]: string };
};

export default function DeployAgentsPage() {
	const creaitorsClient = useMemo(() => new CreaitorsClient(agentsApiServer), []);

	const router = useRouter();
	const {
		query: { agentDeployId: agentDeployIdRaw },
	} = router;

	const agentDeployId = useMemo(() => agentDeployIdRaw as string, [agentDeployIdRaw]);

	const [deployedAgent, setDeployedAgent] = useState<DeployedAgent>();

	const handleFetchDeployedAgent = useCallback(
		async (id: string) => {
			try {
				const response = await creaitorsClient.getAgent(id);
				const data = await response.json();
				console.log("fetched deployed agent", data);

				setDeployedAgent(data);
			} catch (e) {
				console.error(e);
			}
		},
		[creaitorsClient],
	);

	const requiresUserAction = useCallback((agent: DeployedAgent) => {
		if (!agent) return false;

		return [DeployedAgentStatus.ALIVE, DeployedAgentStatus.PENDING_FUND].includes(agent.status);
	}, []);

	// If no user action is required, schedule the next poll in 5 seconds
	useEffect(() => {
		if (!deployedAgent) return;

		let timerId: NodeJS.Timeout;
		if (!requiresUserAction(deployedAgent)) {
			timerId = setTimeout(() => handleFetchDeployedAgent(deployedAgent.id), 5000);
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

	const cachedImage = useCachedImage(agent?.image);

	const agentBalance = useBalance({
		address: deployedAgent?.wallet_address,
	});

	const agentWalletBalance = useMemo(() => {
		if (!agentBalance.data) return 0;

		const { value, decimals } = agentBalance.data;

		return Number(value) / 10 ** decimals;
	}, [agentBalance]);

	const fundTransactionAmount = useMemo(() => {
		if (!deployedAgent) return 0;

		return deployedAgent.required_tokens - agentWalletBalance;
	}, [deployedAgent, agentWalletBalance]);

	const fundTransactionCall = useMemo(() => {
		if (!deployedAgent) return;
		if (fundTransactionAmount <= 0) return;

		return {
			to: deployedAgent.wallet_address,
			value: BigInt(Math.floor(fundTransactionAmount * 10 ** 18)),
		};
	}, [deployedAgent, fundTransactionAmount]);

	const { signMessage } = useSignMessage();

	const handleFinishFundWalletStep = useCallback(
		async (data: ConfigureAgentDeployFormValues) => {
			if (!deployedAgent) return;

			const { name, id, owner, agent_hash } = deployedAgent;
			const { env_variables } = data;

			if (!name || !id || !owner || !agent_hash || (agent?.env_variable_keys && !env_variables))
				return toast.error("Please fill all fields");

			const unsignedAgentKey = `SIGN AGENT ${owner} ${id}`;
			const signedAgentKey = await signMessage(unsignedAgentKey);

			const requestBody = {
				name: name,
				agent_id: id,
				agent_hash: agent_hash,
				owner: owner,
				agent_key: signedAgentKey,
				env_variables: env_variables,
			};

			console.log("requestBody", requestBody);

			await toast.promise(creaitorsClient.deployAgent(requestBody), {
				loading: "Configuring agent deployment...",
				success: "Agent deployment configured successfully",
				error: "Error configuring agent deployment",
			});

			handleFetchDeployedAgent(deployedAgent.id);
		},
		[deployedAgent, agent, signMessage, creaitorsClient, handleFetchDeployedAgent],
	);

	const isAgentWalletFunded = useMemo(() => {
		if (!deployedAgent) return false;

		return agentWalletBalance >= deployedAgent.required_tokens;
	}, [agentWalletBalance, deployedAgent]);

	const defaultValues: ConfigureAgentDeployFormValues = useMemo(() => {
		return {
			env_variables: {},
		};
	}, []);

	const form = useForm({
		defaultValues,
	});

	useEffect(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const { handleSubmit, control } = form;

	const steps = useMemo(() => {
		return {
			[DeployedAgentStatus.PENDING_FUND]: {
				order: 1,
				title: "Pending Funds",
				action: "Fund",
				description: isAgentWalletFunded
					? "The AI Agent's wallet is funded. Please, proceed with the agent deployment."
					: "The AI Agent's wallet requires a minimum amount of ETH to be funded before it can proceed to the next step. Please, ensure the wallet has the necessary funds to continue.",
				content: (
					<>
						{fundTransactionCall && (
							<Transaction
								className="flex-1 items-center"
								calls={[fundTransactionCall]}
								chainId={base.id}
								// onSuccess={handleFinishFundWalletStep}
							>
								<TransactionButton text={`Fund ${fundTransactionAmount} ETH to AI Agent`} className="w-fit" />
								<TransactionToast>
									<TransactionToastIcon />
									<TransactionToastLabel />
									<TransactionToastAction />
								</TransactionToast>
							</Transaction>
						)}
						{!fundTransactionCall && (
							<>
								<Form {...form}>
									<form onSubmit={handleSubmit(handleFinishFundWalletStep)} className="flex flex-col gap-4">
										{agent?.env_variable_keys && agent.env_variable_keys.length > 0 && (
											<FormItem>
												<FormLabel>Environment Variables</FormLabel>
												<FormDescription>Define environment variables for this AI Agent.</FormDescription>
												<FormControl>
													<div className="flex flex-col gap-2">
														{agent.env_variable_keys.map((envName) => (
															<FormField
																key={envName}
																control={control}
																name={`env_variables.${envName}`}
																render={({ field }) => (
																	<FormItem>
																		<FormLabel>{envName}</FormLabel>
																		<FormMessage />
																		<FormControl>
																			<Input placeholder="value" {...field} />
																		</FormControl>
																	</FormItem>
																)}
															/>
														))}
													</div>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
										<Button disabled={!isAgentWalletFunded} type="submit">
											Continue
										</Button>
									</form>
								</Form>
							</>
						)}
					</>
				),
			},
			[DeployedAgentStatus.PENDING_SWAP]: {
				order: 2,
				title: "Pending Swap",
				action: "Swap",
				description:
					"The AI Agent is currently swapping ETH to ALEPH for paying for its own computing. Please, be patient.",
				content: <Loader2 className={`animate-spin text-primary`} size={66} />,
			},
			[DeployedAgentStatus.PENDING_ALLOCATION]: {
				order: 3,
				title: "Pending Allocation",
				action: "Allocate",
				description: "The AI Agent is currently waiting for the allocation of computing resources. Please, be patient.",
				content: <Loader2 className={`animate-spin text-primary`} size={66} />,
			},
			[DeployedAgentStatus.PENDING_START]: {
				order: 4,
				title: "Pending Start",
				action: "Start",
				description: "The AI Agent is currently starting up. Please, be patient.",
				content: <Loader2 className={`animate-spin text-primary`} size={66} />,
			},
			[DeployedAgentStatus.PENDING_DEPLOY]: {
				order: 5,
				title: "Pending Deploy",
				action: "Deploy",
				description: "The AI Agent is currently deploying. Please, be patient.",
				content: <Loader2 className={`animate-spin text-primary`} size={66} />,
			},
			[DeployedAgentStatus.ALIVE]: {
				order: 0,
				title: "Alive",
				action: "Alive",
				description: "The AI Agent is alive",
				content: <div>Alive</div>,
			},
		};
	}, [
		agent,
		control,
		form,
		fundTransactionAmount,
		fundTransactionCall,
		handleFinishFundWalletStep,
		handleSubmit,
		isAgentWalletFunded,
	]);

	const currentStep = useMemo(() => {
		if (!deployedAgent) return;

		return steps[deployedAgent.status];
	}, [deployedAgent, steps]);

	const stepActions = useMemo(
		() =>
			Object.values(steps)
				.map((step) => (step.order > 0 ? step.action : undefined))
				.filter((action) => action !== undefined),
		[steps],
	);

	if (isLoadingAgents) return <Loader size={42} />;
	if (!deployedAgent) return <div>Deployment not found</div>;
	if (!agent) return <div>Agent not found</div>;

	return (
		<PageContainer>
			<div className="flex flex-row pt-8">
				<div className="flex flex-col w-[33%] gap-y-4">
					<p className="text-5xl font-extrabold">{agent.name}</p>
					<Image
						src={cachedImage || agent.image}
						alt="Agent image"
						className="min-h-full w-full object-cover rounded-xl"
						width={0}
						height={0}
						// onLoadingComplete={() => setIsImageLoading(false)}
					/>
					<Identity address={deployedAgent.wallet_address} chain={base} className="w-ful items-center py-4">
						<Address isSliced={false} className="italic" />
						<EthBalance className="font-bold mr-2" />
					</Identity>
					<p className="text-lg">{agent.description}</p>
				</div>
				<div className="text-center w-full max-w-[66%] px-24">
					{currentStep && (
						<>
							<p className="text-5xl font-bold mb-12">{currentStep.title}</p>
							<StepProgressIndicator steps={stepActions} currentStep={currentStep.order} />
							<div className="flex flex-col items-center text-center justify-center gap-8">
								<div className="max-w-[50%] text-center text-lg italic">{currentStep.description}</div>
								{currentStep.content}
							</div>
						</>
					)}
				</div>
			</div>
		</PageContainer>
	);
}
