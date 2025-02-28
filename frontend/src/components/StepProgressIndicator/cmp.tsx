import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckIcon } from "lucide-react";

interface StepProgressIndicatorProps {
	steps: string[];
	currentStep?: number;
	onStepChange?: (step: number) => void;
}

export default function StepProgressIndicator({
	steps = ["Step 1", "Step 2", "Step 3", "Step 4"],
	currentStep = 1,
}: StepProgressIndicatorProps) {
	const totalSteps = useMemo(() => steps.length, [steps]);
	const progressPercentage = useMemo(() => ((currentStep - 1) / (totalSteps - 1)) * 100, [currentStep, totalSteps]);

	return (
		<>
			<div className="relative mb-12">
				{/* Background track */}
				<div className="absolute top-5 left-0 right-0 h-1 bg-foreground/20 rounded-full" />

				{/* Animated progress bar */}
				<motion.div
					className="absolute top-5 left-0 h-1 bg-primary rounded-full"
					initial={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
					animate={{ width: `${progressPercentage}%` }}
					transition={{ duration: 0.5, ease: "easeInOut" }}
				/>

				{/* Step circles */}
				<div className="relative flex justify-between items-center">
					{steps.map((step, index) => {
						const stepNumber = index + 1;
						const isCompleted = stepNumber < currentStep;
						const isActive = stepNumber === currentStep;

						return (
							<div key={stepNumber} className="flex flex-col items-center relative -top-1/2">
								<motion.div
									className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 z-10
                    ${
											isCompleted
												? "bg-primary border-primary text-primary-foreground"
												: isActive
													? "border-primary bg-primary text-primary"
													: "border-foreground/50 bg-primary text-foreground/50"
										}
                  `}
									initial={{ scale: 1 }}
									animate={{
										scale: isActive ? 1.1 : 1,
										backgroundColor: isCompleted
											? "hsl(var(--primary))"
											: isActive
												? "hsl(var(--background))"
												: "hsl(var(--background))",
									}}
									transition={{ duration: 0.3 }}
								>
									{isCompleted ? (
										<CheckIcon className="w-5 h-5" />
									) : (
										<span className="text-sm font-medium">{stepNumber}</span>
									)}
								</motion.div>
								<span
									className={`mt-2 text-xs font-medium ${isActive || isCompleted ? "text-primary" : "text-foreground/50"}`}
								>
									{step}
								</span>
							</div>
						);
					})}
				</div>
			</div>
		</>
	);
}
