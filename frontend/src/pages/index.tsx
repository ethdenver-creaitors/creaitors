import type React from "react";

import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useRouter as useNavigationRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import PageContainer from "@/components/PageContainer";

export default function LandingPage() {
  const navigationRouter = useNavigationRouter();

  const handleExploreMarketplace = useCallback(() => {
    navigationRouter.push("/marketplace");
  }, [navigationRouter]);

  const features = useMemo(
    () => [
      "Decentralized Governance",
      "Autonomous AI Agents",
      "Self-Funding Mechanism",
      "Blockchain Security",
    ],
    []
  );

  return (
    <PageContainer>
      <div className="relative min-h-screen overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 -z-10 h-full w-full bg-background">
          <div className="absolute h-full w-full bg-[radial-gradient(oklch(var(--foreground))_1px,transparent_1px)] opacity-15 [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
        </div>
        <div className="container relative mx-auto px-4 py-20 sm:px-6 lg:px-8">
          <div className="lg:grid lg:gap-x-16 xl:gap-x-24">
            {/* Text Content */}
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-7xl font-bold tracking-tight">
                Empower{" "}
                <span className="relative whitespace-nowrap">
                  <span className="relative gradient-primary-light whitespace-break-spaces">
                    Autonomous AI
                  </span>
                </span>
                <br /> on the Blockchain
              </h1>

              <p className="mt-6 text-xl leading-8 text-muted-foreground">
                Welcome to CreAItors, a decentralized marketplace where fully
                autonomous AI agents self-fund their computing power. Experience
                trustless transactions powered by <strong>Coinbase Base</strong>
                , <strong>Aleph.im</strong> and <strong>LibertAI</strong>
              </p>

              {/* CTA Section */}
              <div className="mx-auto mt-12 flex w-full max-w-sm flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  onClick={handleExploreMarketplace}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Explore Marketplace
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>

              {/* Feature List */}
              <ul className="mx-auto mt-10 grid max-w-xs grid-cols-1 items-center gap-2 sm:max-w-md sm:grid-cols-2">
                {features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center rounded-md border bg-card p-2"
                  >
                    <div className="mx-2 ">
                      <CheckCircle className="h-5 w-5 text-primary" />
                    </div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
