import styled from "styled-components";

export const SkipToContentLink = styled.a`
  position: fixed;
  top: -120px;
  left: ${({ theme }) => theme.spacing[3]};
  z-index: calc(${({ theme }) => theme.zIndex.sidebar} + 2);
  background: ${({ theme }) => theme.tokens.color.interactive.primary};
  color: ${({ theme }) => theme.tokens.color.text.inverse};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  transition: top ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.easing};

  &:focus-visible {
    top: ${({ theme }) => theme.spacing[3]};
  }
`;

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

export const MainContent = styled.main`
  flex: 1;
  min-width: 0;
  padding: ${({ theme }) => theme.spacing[4]};
  overflow-x: hidden;
  padding-top: calc(${({ theme }) => theme.spacing[4]} + 3rem);

  @media (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding-top: ${({ theme }) => theme.spacing[4]};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: ${({ theme }) => theme.spacing[3]};
    padding-top: calc(${({ theme }) => theme.spacing[3]} + 3rem);
  }
`;
