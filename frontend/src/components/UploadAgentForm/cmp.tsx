import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { AuthenticatedAlephHttpClient } from "@aleph-sdk/client";
import { ItemType } from "@aleph-sdk/message";
import { useSelector } from "react-redux";
import { AppState } from "@/store/store";

export type UploadAgentFormValues = {
  name?: string;
  description?: string;
  sourceCode?: File | undefined;
  image?: File | undefined;
};

export default function UploadAgentForm() {
  const defaultValues: UploadAgentFormValues = useMemo(() => {
    return {
      name: undefined,
      description: undefined,
      sourceCode: undefined,
      image: undefined,
    };
  }, []);

  const form = useForm({
    defaultValues,
  });

  const { handleSubmit, control } = form;

  const { alephAccount, alephClient } = useSelector(
    (state: AppState) => state.aleph
  );

  const onSubmit = async (data: UploadAgentFormValues) => {
    if (!alephAccount) return;
    if (!(alephClient instanceof AuthenticatedAlephHttpClient)) return;

    const storeSourceCodeResponse = await alephClient.createStore({
      channel: "test-creaitors",
      fileObject: data.sourceCode!,
      storageEngine: ItemType.ipfs,
    });

    const storeImageResponse = await alephClient.createStore({
      channel: "test-creaitors",
      fileObject: data.image!,
      storageEngine: ItemType.ipfs,
    });

    await alephClient.createPost({
      channel: "test-creaitors",
      address: alephAccount.address,
      postType: "test-creaitors-agent",
      content: {
        name: data.name,
        description: data.description,
        source_code_hash: storeSourceCodeResponse.item_hash,
        image: storeImageResponse.item_hash,
      },
    });
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
                <Input
                  placeholder="Autonomous AI Agent that trades makes profit by trading on the crypto market"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Brief explanation of what the AI Agent does
              </FormDescription>
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
