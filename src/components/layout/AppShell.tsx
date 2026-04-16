import styled from "styled-components";

export const AppShellContainer = styled.div`
  display: flex;
  min-height: 100vh;
  width: 100%;
  background:
    linear-gradient(
      180deg,
      ${({ theme }) => `${theme.tokens.color.bg.surfaceElevated}22`},
      transparent
    ),
    ${({ theme }) => theme.tokens.color.bg.default};
  color: ${({ theme }) => theme.tokens.color.text.primary};
  transition:
    background ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.easing},
    color ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.easing};
`;

export const MainContent = styled.section`
  flex: 1;
  min-width: 0;
  padding: ${({ theme }) => theme.spacing[4]};
  overflow-x: hidden;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: ${({ theme }) => theme.spacing[3]};
  }
`;
