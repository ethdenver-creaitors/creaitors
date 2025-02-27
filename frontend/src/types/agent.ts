import { Address } from "viem";

export type Agent = {
  id: string;
  image: string;
  name: string;
  description: string;
  source_code_hash?: string;
  category: string;
};

export enum DeployedAgentStatus {
  PENDING_FUND = "PENDING_FUND",
  PENDING_ALLOCATION = "PENDING_ALLOCATION",
  PENDING_START = "PENDING_START",
  PENDING_DEPLOY = "PENDING_DEPLOY",
  ALIVE = "ALIVE",
}

export type DeployedAgent = {
  id: string;
  name: string;
  owner: Address;
  wallet_address: Address;
  required_tokens: number;
  instance_hash: string;
  agent_hash: string;
  last_update: number;
  status: DeployedAgentStatus;
  tags: string[];
  post_hash: string;
  instance_ip: string;
};
