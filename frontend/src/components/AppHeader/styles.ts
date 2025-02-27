import Link from "next/link";
import styled, { css } from "styled-components";

export type StyledAgentCardProps = {
	$isActive: boolean;
};

export const NavigationLink = styled(Link)<StyledAgentCardProps>`
	font-size: 1.125rem;
	font-weight: 500;
	transition: all 0.3s;

	${({ $isActive }) =>
		$isActive
			? css`
					color: hsl(var(--primary));
					font-weight: 700;
				`
			: css`
					&:hover {
						cursor: pointer;
						color: hsl(var(--primary));
					}
				`}
`;
