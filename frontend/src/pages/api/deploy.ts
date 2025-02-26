// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  wallet: string;
  required_tokens: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  res.status(200).json({
    wallet: "0x5f78199cd833c1dc1735bee4a7416caaE58Facca",
    required_tokens: "0.00001",
  });
}
