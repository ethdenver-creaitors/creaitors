import { OktoClientConfig } from "@okto_web3/react-sdk";

export const oktoConfig: OktoClientConfig = {
	environment: "sandbox",
	clientPrivateKey: process.env.NEXT_PUBLIC_OKTO_CLIENT_PRIVATE_KEY! as `0x${string}`,
	clientSWA: process.env.NEXT_PUBLIC_OKTO_CLIENT_SWA! as `0x${string}`,
};
