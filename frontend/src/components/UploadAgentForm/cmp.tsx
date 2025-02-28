import { useMemo } from "react";
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

export type UploadAgentFormValues = {
	name?: string;
	description?: string;
	sourceCode?: File | undefined;
	image?: File | undefined;
	category?: string;
};

export default function UploadAgentForm({ onUploadSuccess: handleUploadSuccess }: { onUploadSuccess: () => void }) {
	const defaultValues: UploadAgentFormValues = useMemo(() => {
		return {
			name: undefined,
			description: undefined,
			sourceCode: undefined,
			image: undefined,
			category: undefined,
		};
	}, []);

	const form = useForm({
		defaultValues,
	});

	const { handleSubmit, control } = form;

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

				<Button type="submit">Submit</Button>
			</form>
		</Form>
	);
}
