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
import { Separator } from "@/components/ui/separator";

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
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-expect-error
			await toast.promise(creaitorsClient.deployAgent(requestBody), {
				loading: "Configuring agent deployment...",
				success: "Agent deployment configured successfully",
				error: "Error configuring agent deployment",
			});

			// Wait 2 seconds to make sure the agent has started the deployment process
			await new Promise((resolve) => setTimeout(resolve, 2000));
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

	// New state to handle the decisions from the agent (survival logs)
	const [decisions, setDecisions] = useState<Record<string, string> | null>(null);
	const [loadingDecisions, setLoadingDecisions] = useState(false);
	const [errorDecisions, setErrorDecisions] = useState<Error | null>(null);

	// Fetch decisions every 25 seconds when the agent is alive
	useEffect(() => {
		if (deployedAgent?.status === DeployedAgentStatus.ALIVE) {
			const fetchDecisions = () => {
				setLoadingDecisions(true);
				// Note: the instance_ip is an IPv6 address so we wrap it in brackets
				const url = `http://[${deployedAgent.instance_ip}]:8000/survival-logs`;
				fetch(url)
					.then((res) => res.json())
					.then((data) => {
						setDecisions(data);
						setLoadingDecisions(false);
					})
					.catch((err) => {
						setErrorDecisions(err);
						setLoadingDecisions(false);
					});
			};

			// Fetch immediately
			fetchDecisions();
			// Set interval for every 25 seconds
			const intervalId = setInterval(fetchDecisions, 25000);
			return () => clearInterval(intervalId);
		}
	}, [deployedAgent]);

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
								onSuccess={() => {
									agentBalance.refetch();
								}}
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
							<Form {...form}>
								<form onSubmit={handleSubmit(handleFinishFundWalletStep)} className="flex flex-col gap-4">
									{agent?.env_variable_keys && agent.env_variable_keys.length > 0 && (
										<FormItem>
											<FormLabel>Environment Variables</FormLabel>
											<FormDescription>Define the environment variables used for this AI Agent.</FormDescription>
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
				description: undefined,
				content: (
					<div className="flex flex-col gap-4">
						{loadingDecisions ? (
							<div className="flex flex-col gap-4 items-center justify-center">
								<div>Loading decisions...</div>
								<Loader2 className={`animate-spin text-primary`} size={66} />
							</div>
						) : errorDecisions ? (
							<div>Error loading decisions: {errorDecisions.message}</div>
						) : decisions ? (
							<div className="bg-background p-4 rounded-lg border border-foreground/20">
								{Object.entries(decisions)
									.sort(([tsA], [tsB]) => new Date(tsB).getTime() - new Date(tsA).getTime())
									.map(([timestamp, decision]) => (
										<div
											key={timestamp}
											className="border-b border-gray-300 pb-6 pt-6 first:pt-0 last:border-none last:pb-0"
										>
											<strong>
												{new Date(timestamp).toLocaleDateString()} - {new Date(timestamp).toLocaleTimeString()}
											</strong>
											<div className="flex items-center justify-center w-full my-2">
												<Separator className="w-1/3" />
											</div>
											<pre className="whitespace-pre-wrap mt-1">{decision}</pre>
										</div>
									))}
							</div>
						) : (
							<div>No decisions available.</div>
						)}
					</div>
				),
			},
		};
	}, [
		agent,
		agentBalance,
		control,
		form,
		fundTransactionAmount,
		fundTransactionCall,
		handleFinishFundWalletStep,
		handleSubmit,
		isAgentWalletFunded,
		decisions,
		loadingDecisions,
		errorDecisions,
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
					<Identity address={deployedAgent.wallet_address} chain={base} className="w-ful items-center py-4">
						<Address isSliced={false} className="italic" />
						<EthBalance className="font-bold mr-2" />
					</Identity>
					<Image
						src={cachedImage || agent.image}
						alt="Agent image"
						className="min-h-full w-full object-cover rounded-xl"
						width={0}
						height={0}
					/>
					<p className="text-lg">{agent.description}</p>
				</div>
				<div className="text-center w-full max-w-[66%] px-24">
					{currentStep && (
						<>
							<p className="text-5xl font-bold mb-12">{currentStep.title}</p>
							{currentStep.order > 0 && <StepProgressIndicator steps={stepActions} currentStep={currentStep.order} />}
							<div className="flex flex-col items-center text-center justify-center gap-8">
								{!!currentStep?.description && (
									<div className="max-w-[50%] text-center text-lg italic">{currentStep.description}</div>
								)}
								{currentStep.content}
							</div>
						</>
					)}
				</div>
			</div>
		</PageContainer>
	);
}
