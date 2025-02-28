import AgentDetails from "@/components/AgentDetails";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import useFetchAgents from "@/hooks/useFetchAgents";
import { AppState } from "@/store/store";
import { agentsApiServer } from "@/utils/constants";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import { Loader } from "@/components/loader";
import toast from "react-hot-toast";
import useSignMessage from "@/hooks/useSignMessage";

export type ConfigureAgentDeployFormValues = {
	name?: string;
	agentId?: string;
	agentHash?: string;
	owner?: string;
};

export default function DeployAgentPage() {
	const router = useRouter();
	const {
		query: { agentId },
	} = router;

	const { agents, isLoading: isLoadingAgents } = useFetchAgents();

	const { alephAccount } = useSelector((state: AppState) => state.aleph);

	const agent = useMemo(() => agents.find((agent) => agent.id === agentId), [agents, agentId]);

	const defaultValues: ConfigureAgentDeployFormValues = useMemo(() => {
		return {
			name: undefined,
			agentId: uuidv4(),
			agentHash: agent?.id,
			owner: alephAccount?.address,
		};
	}, [agent, alephAccount]);

	const form = useForm({
		defaultValues,
	});

	useEffect(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const { handleSubmit, control } = form;

	const { signMessage } = useSignMessage();

	const onSubmit = async (data: ConfigureAgentDeployFormValues) => {
		try {
			const unsignedAgentKey = `SIGN AGENT ${data.owner} ${data.agentId}`;

			const signedAgentKey = await signMessage(unsignedAgentKey);

			const requestBody = {
				name: data.name,
				agent_id: data.agentId,
				agent_hash: data.agentHash,
				owner: data.owner,
				agent_key: signedAgentKey,
			};

			const response = await toast.promise(
				fetch(`${agentsApiServer}/agent`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestBody),
				}),
				{
					loading: "Deploying agent...",
					success: "Agent deployed successfully",
					error: "Error deploying agent",
				},
			);

			console.log("response", response);

			if (response.ok) {
				router.push(`/deployed-agents/${data.agentId}`);
			}
		} catch (e) {
			console.error(e);
		}
	};

	if (isLoadingAgents) return <Loader size={42} />;
	if (!agent) return <div>Agent not found</div>;

	return (
		<PageContainer>
			<div className="flex gap-8">
				<div className="flex max-w-[33%]">
					<div className="flex flex-col gap-4 ">
						<p className="font-extrabold text-5xl">Selected Agent</p>
						<AgentDetails agent={agent} />
					</div>
					<Separator orientation="vertical" className="w-1" />
				</div>
				<div className="flex flex-col gap-4 max-w-[66%]">
					<p className="font-extrabold text-5xl">Configure Agent Deploy</p>
					<Form {...form}>
						<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
										<FormDescription>Used to easily identify your running agent</FormDescription>
									</FormItem>
								)}
							/>
							<Button type="submit">Submit</Button>
						</form>
					</Form>
				</div>
			</div>
		</PageContainer>
	);
}
