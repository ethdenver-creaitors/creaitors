import styled, { css } from "styled-components";

export type StyledAgentCardProps = {
  $clickable?: boolean;
};

export const StyledAgentCard = styled.div<StyledAgentCardProps>`
  width: 12rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-left: 0.125rem;
  padding-right: 0.125rem;

  ${({ $clickable }) =>
    $clickable &&
    css`
      cursor: pointer;
    `}
`;
