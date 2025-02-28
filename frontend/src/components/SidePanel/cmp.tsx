import React, { memo } from "react";
import { StyledBackdrop, StyledSidePanel } from "./styles";
import { SidePanelProps } from "./types";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import useBreakpoints from "@/hooks/breakpoints/useBreakpoints";

export const SidePanel = ({ children, title, isOpen, onClose: handleClose }: SidePanelProps) => {
	const { isDesktop } = useBreakpoints();

	return (
		<>
			<StyledBackdrop $isOpen={isOpen} onClick={handleClose} />
			<StyledSidePanel $isOpen={isOpen}>
				<div className="sticky top-0 bg-background pt-10 shadow-[0_0_10px_hsl(var(--foreground))]">
					<Button variant="ghost" onClick={handleClose} className="absolute top-4 left-4">
						{isDesktop ? <ChevronRight /> : <ChevronDown />}
					</Button>
					<p className="flex justify-center items-center text-center w-full px-4 mb-4 font-bold text-3xl">{title}</p>
					<Separator />
				</div>
				<div className="p-12">{children}</div>
			</StyledSidePanel>
		</>
	);
};

SidePanel.displayName = "SidePanel";

export default memo(SidePanel) as typeof SidePanel;
