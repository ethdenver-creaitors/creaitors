import React, { memo } from "react";
import { StyledBackdrop, StyledSidePanel } from "./styles";
import { SidePanelProps } from "./types";
import { ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

export const SidePanel = ({ children, title, isOpen, onClose: handleClose }: SidePanelProps) => {
	console.log("is open", isOpen);
	return (
		<>
			<StyledBackdrop $isOpen={isOpen} onClick={handleClose} />
			<StyledSidePanel $isOpen={isOpen}>
				<Button variant="ghost" onClick={handleClose} className="absolute top-4 left-4">
					<ChevronRight />
				</Button>
				<div className="flex justify-center items-center text-center w-full px-4 mb-4">{title}</div>
				<Separator />
				<div className="p-4">{children}</div>
			</StyledSidePanel>
		</>
	);
};

SidePanel.displayName = "SidePanel";

export default memo(SidePanel) as typeof SidePanel;
