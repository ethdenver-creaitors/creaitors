import styled, { css } from "styled-components";

export type StyledAgentCardProps = {
	$clickable?: boolean;
};

export const StyledAgentCard = styled.div<StyledAgentCardProps>`
	position: relative;

	${({ $clickable }) =>
		$clickable &&
		css`
			cursor: pointer;
		`}
`;
