import styled, { css } from "styled-components";

export type StyledAgentCardProps = {
  $clickable?: boolean;
};

export const StyledAgentCard = styled.div<StyledAgentCardProps>`
  ${({ $clickable }) =>
    $clickable &&
    css`
      cursor: pointer;
    `}
`;
