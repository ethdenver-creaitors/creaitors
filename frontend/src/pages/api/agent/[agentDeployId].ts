// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { DeployedAgent, DeployedAgentStatus } from "@/types/agent";
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeployedAgent>
) {
  console.log("req.query", req.query);
  console.log("req.method", req.method);

  res.status(200).json({
    id: "27c9ab36-fc5f-4917-95eb-65c3209d9007",
    name: "My Personal Trading Agent",
    owner: "0xA07B1214bAe0D5ccAA25449C3149c0aC83658874",
    wallet_address: "0x5f78199cd833c1dc1735bee4a7416caaE58Facca",
    min_required_tokens: "0.001",
    instance_hash:
      "44a4f76bcdbe6315cce938c682f8a3801694a4d758f70a1d631cc9e8435d4e72",
    agent_hash:
      "115bc9f855bc54f0bc92712959b8f7f47c37fe832f31ce6da96b1187a2c9b423",
    last_update: 1740455398,
    // status: DeployedAgentStatus.PENDING_FUND,
    // status: DeployedAgentStatus.PENDING_ALLOCATION,
    // status: DeployedAgentStatus.PENDING_START,
    // status: DeployedAgentStatus.PENDING_DEPLOY,
    status: DeployedAgentStatus.ALIVE,
    tags: [
      "27c9ab36-fc5f-4917-95eb-65c3209d9007",
      "0xA07B1214bAe0D5ccAA25449C3149c0aC83658874",
    ],
    post_hash:
      "502926d67274bf0c26d88e0154bddb821a0af31bd78085e2a2837c8a95213654",
    instance_ip: "2a01:4f8:110:142e:3:44a4:f76b:cdb1",
  });
}
