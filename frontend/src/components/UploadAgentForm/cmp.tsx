import {useCallback, useEffect, useMemo, useState} from "react";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import { AuthenticatedAlephHttpClient } from "@aleph-sdk/client";
import { ItemType } from "@aleph-sdk/message";
import { useSelector } from "react-redux";
import { AppState } from "@/store/store";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { agentCategories } from "@/utils/constants";
import toast from "react-hot-toast";
import {PlusCircleIcon, TrashIcon} from "lucide-react";

export type UploadAgentFormValues = {
	name?: string;
	description?: string;
	sourceCode?: File | undefined;
	image?: File | undefined;
	category?: string;
	env_variable_keys?: string[];
};

export default function UploadAgentForm({ onUploadSuccess: handleUploadSuccess }: { onUploadSuccess: () => void }) {
	const defaultValues: UploadAgentFormValues = useMemo(() => {
		return {
			name: undefined,
			description: undefined,
			sourceCode: undefined,
			image: undefined,
			category: undefined,
			env_variable_keys: [],
		};
	}, []);

	const form = useForm({
		defaultValues,
	});

	const { setValue, handleSubmit, control } = form;

	const { alephAccount, alephClient } = useSelector((state: AppState) => state.aleph);

	const onSubmit = async (data: UploadAgentFormValues) => {
		if (!alephAccount) return;
		if (!(alephClient instanceof AuthenticatedAlephHttpClient)) return;

		const storeSourceCodeResponse = await toast.promise(
			alephClient.createStore({
				channel: "test-creaitors",
				fileObject: data.sourceCode!,
				storageEngine: ItemType.ipfs,
			}),
			{
				loading: "Uploading source code...",
				success: "Source code uploaded",
				error: "Failed to upload source code",
			},
		);

		const storeImageResponse = await toast.promise(
			alephClient.createStore({
				channel: "test-creaitors",
				fileObject: data.image!,
				storageEngine: ItemType.ipfs,
			}),
			{
				loading: "Uploading image...",
				success: "Image uploaded",
				error: "Failed to upload image",
			},
		);

		await toast.promise(
			alephClient.createPost({
				channel: "test-creaitors",
				address: alephAccount.address,
				postType: "test-creaitors-agent",
				content: {
					name: data.name,
					description: data.description,
					category: data.category,
					source_code_hash: storeSourceCodeResponse.item_hash,
					image: storeImageResponse.item_hash,
					env_variable_keys: data.env_variable_keys,
				},
			}),
			{
				loading: "Uploading agent...",
				success: "Agent uploaded",
				error: "Failed to upload agent",
			},
		);

		handleUploadSuccess();
	};

	const [envVars, setEnvVars] = useState<string[]>(defaultValues.env_variable_keys);

	const addEnvVar = useCallback(() => {
		setEnvVars(prevEnvVars => [...prevEnvVars, ""]);
	}, []);

	const removeEnvVar = useCallback((indexToRemove: number) => {
		setEnvVars(prevEnvVars => prevEnvVars.filter((_, index) => index !== indexToRemove));
	}, []);

	const handleEnvVarChange = useCallback((index: number, value: string) => {
		setEnvVars(prevEnvVars => {
			const updatedEnvVars = [...prevEnvVars];
			updatedEnvVars[index] = value;
			return updatedEnvVars;
		});
	}, []);

	useEffect(() => {
		setValue("env_variable_keys", envVars);
	}, [envVars, setValue]);

	return (
		<Form {...form}>
			<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
				<FormField
					control={control}
					name="image"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Image</FormLabel>
							<FormMessage />
							<FormControl>
								<Input
									type="file"
									accept="image/*"
									onChange={(e) => {
										field.onChange(e.target.files![0]);
									}}
								/>
							</FormControl>
						</FormItem>
					)}
				/>
				<FormField
					control={control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Name</FormLabel>
							<FormMessage />
							<FormControl>
								<Input placeholder="The TrAIder 2.0" {...field} />
							</FormControl>
						</FormItem>
					)}
				/>
				<FormField
					control={control}
					name="description"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Description</FormLabel>
							<FormMessage />
							<FormControl>
								<Textarea
									placeholder="Autonomous AI Agent that makes profit by trading on the crypto market"
									{...field}
								/>
							</FormControl>
							<FormDescription>Brief explanation of what the AI Agent does</FormDescription>
						</FormItem>
					)}
				/>
				{/* Category Select */}
				<FormField
					control={control}
					name="category"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Category</FormLabel>
							<FormMessage />
							<FormControl>
								<Select onValueChange={field.onChange} value={field.value}>
									<SelectTrigger>
										<SelectValue placeholder="Select a category" />
									</SelectTrigger>
									<SelectContent>
										{agentCategories.map((category) => (
											<SelectItem key={category} value={category}>
												{category}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</FormControl>
						</FormItem>
					)}
				/>

				<FormField
					control={control}
					name="sourceCode"
					render={({ field }) => (
						<FormItem>
							<FormLabel>AI Agent source code</FormLabel>
							<FormMessage />
							<FormControl>
								<Input
									type="file"
									accept=".zip"
									onChange={(e) => {
										field.onChange(e.target.files![0]);
									}}
								/>
							</FormControl>
						</FormItem>
					)}
				/>

				<FormItem>
					<FormLabel>Environment Variables</FormLabel>
					<FormDescription>Define environment variable names for your AI Agent.</FormDescription>
					<FormControl>
						<div className="flex flex-col gap-2">
							{envVars.map((envVar, index) => ( // Iterate over the array directly
								<div key={index} className="flex gap-2 items-center">
									<div className="grid gap-1.5 flex-1">
										<FormLabel htmlFor={`env-name-${index}`} className="sr-only">
											Variable Name
										</FormLabel>
										<Input
											id={`env-name-${index}`}
											placeholder="VARIABLE_NAME"
											value={envVar}
											onChange={(e) => handleEnvVarChange(index, e.target.value)} // Pass index to handler
										/>
									</div>
									<Button
										variant="destructive"
										size="icon"
										onClick={() => removeEnvVar(index)} // Pass index to remove function
										type="button"
									>
										<TrashIcon className="h-4 w-4" />
									</Button>
								</div>
							))}
							<Button variant="secondary" size="sm" type="button" onClick={addEnvVar}>
								<PlusCircleIcon className="mr-2 h-4 w-4" />
								Add Field
							</Button>
						</div>
					</FormControl>
					<FormMessage />
				</FormItem>

				<Button type="submit">Submit</Button>
			</form>
		</Form>
	);
}
