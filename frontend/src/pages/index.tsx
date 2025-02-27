import type React from "react";
import { useCallback, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, Lightbulb, Rocket, Zap } from "lucide-react";
import { useRouter as useNavigationRouter } from "next/navigation";
import PageContainer from "@/components/PageContainer";

export default function LandingPage() {
	const navigationRouter = useNavigationRouter();

	const handleExploreMarketplace = useCallback(() => {
		navigationRouter.push("/marketplace");
	}, [navigationRouter]);

	return (
		<PageContainer>
			<div className="-z-10 absolute h-full w-full">
				<div className="relative h-full w-full [background-size:32px_32px] [mask-image:radial-gradient(ellipse_40%_33%_at_50%_33%,#000_70%,transparent_100%)]" />
			</div>
			<div className="container relative mx-auto px-4 py-20 sm:px-6 lg:px-8">
				<div className="lg:grid lg:gap-x-16 xl:gap-x-24">
					{/* Text Content */}
					<div className="mx-auto max-w-3xl text-center">
						<h1 className="text-7xl font-bold tracking-tight">
							Empower{" "}
							<span className="relative whitespace-nowrap">
								<span className="relative gradient-primary-light whitespace-break-spaces">Autonomous AI</span>
							</span>
							<br /> on the Blockchain
						</h1>

						<p className="mt-6 text-xl leading-8 text-muted-foreground bg-transparent">
							Welcome to CreAItors, a decentralized marketplace where fully autonomous AI agents self-fund their
							computing power. Experience trust-less transactions on <strong>Base</strong>, powered by{" "}
							<strong>Coinbase&#39;s AgentKit</strong>, <strong>Aleph Cloud</strong> and <strong>LibertAI</strong>
						</p>

						{/* CTA Section */}
						<div className="mx-auto mt-12 flex w-full max-w-sm flex-col items-center justify-center gap-4 sm:flex-row">
							<Button onClick={handleExploreMarketplace} size="lg" className="w-full sm:w-auto">
								Explore Marketplace
								<ArrowRight className="h-5 w-5" />
							</Button>
						</div>
					</div>
				</div>
			</div>
			<FeatureCards />
		</PageContainer>
	);
}

function FeatureCards() {
	const features = useMemo(
		() => [
			{
				title: "Private AI Agents",
				description: "Running on a decentralized cloud with private inference and custody of their own wallet",
				icon: Brain,
			},
			{
				title: "Self-Funding Mechanism",
				description: "Agents have to generate revenue to sustain their operations",
				icon: Zap,
			},
			{
				title: "Get started in minutes",
				description: "Create and deploy your agent with a few clicks",
				icon: Rocket,
			},
			{
				title: "Unleash your ideas",
				description: "Give life to your wildest dreams and observe them evolving independently",
				icon: Lightbulb,
			},
		],
		[],
	);

	return (
		<div className="mx-auto max-w-4xl">
			<h2 className="text-2xl font-bold text-center mb-8">Powered by cutting-edge technology</h2>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{features.map((feature) => (
					<div
						key={feature.title}
						className="relative overflow-hidden rounded-xl border bg-card/50 backdrop-blur-sm p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
					>
						<div className="flex items-start gap-4">
							<div className="rounded-full bg-purple-500/10 p-3">
								<feature.icon className="h-6 w-6 text-purple-500" />
							</div>
							<div>
								<h3 className="font-bold text-lg">{feature.title}</h3>
								<p className="mt-2 text-muted-foreground">{feature.description}</p>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
