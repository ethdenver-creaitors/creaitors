import React, { memo } from "react";
import { StyledBackdrop, StyledSidePanel } from "./styles";
import { SidePanelProps } from "./types";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import useBreakpoints from "@/hooks/breakpoints/useBreakpoints";

export const SidePanel = ({
  children,
  title,
  isOpen,
  onClose: handleClose,
}: SidePanelProps) => {
  const { isDesktop } = useBreakpoints();

  return (
    <>
      <StyledBackdrop $isOpen={isOpen} onClick={handleClose} />
      <StyledSidePanel $isOpen={isOpen}>
        <Button
          variant="ghost"
          onClick={handleClose}
          className="absolute top-4 left-4"
        >
          {isDesktop ? <ChevronRight /> : <ChevronDown />}
        </Button>
        <div className="flex justify-center items-center text-center w-full px-4 mb-4">
          {title}
        </div>
        <Separator />
        <div className="p-4">{children}</div>
      </StyledSidePanel>
    </>
  );
};

SidePanel.displayName = "SidePanel";

export default memo(SidePanel) as typeof SidePanel;
