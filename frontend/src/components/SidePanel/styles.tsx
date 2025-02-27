import styled, { css } from "styled-components";
import { StyledSidePanelProps } from "./types";

export const StyledBackdrop = styled.div<StyledSidePanelProps>`
	display: none;
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background: rgba(0, 0, 0, 0.5);
	transition: opacity 0.5s ease-in-out;
	opacity: 0;
	z-index: 49; /* just below the side panel */

	${({ $isOpen }) =>
		$isOpen &&
		css`
			display: block;
			opacity: 1;
		`}
`;

export const StyledSidePanel = styled.div<StyledSidePanelProps>`
	position: fixed;
	top: 0;
	right: 0;
	height: 100vh;
	width: 50vw;

	background-color: hsl(var(--background));

	box-shadow: -4px 0 6px rgba(0, 0, 0, 0.1);
	overflow-y: auto;
	padding: 2.5rem;

	/* For sliding effect */
	transform: translateX(100%);
	transition: transform 0.3s ease-in-out;

	z-index: 50;

	${({ $isOpen }) =>
		$isOpen
			? css`
					transform: translateX(0);
				`
			: css`
					transform: translateX(100%);
				`}
`;
