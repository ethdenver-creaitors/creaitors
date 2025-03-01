import { Address } from "viem";

export type AgentPost = {
	name: string;
	agent_id: string;
	agent_hash: string;
	owner: Address;
	agent_key: Address;
	env_variables?: { [key: string]: string };
};

export default class CreaitorsClient {
	private apiServer: string;

	constructor(apiServer: string) {
		this.apiServer = apiServer;
	}

	async deployAgent(requestBody: AgentPost): Promise<Response> {
		const response = await fetch(`${this.apiServer}/agent/deploy`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		});
		return response;
	}

	async createAgent(requestBody: AgentPost): Promise<Response> {
		const response = await fetch(`${this.apiServer}/agent`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		});

		return response;
	}

	async getAgent(id: string): Promise<Response> {
		const response = await fetch(`${this.apiServer}/agent/${id}`);

		return response;
	}
}
