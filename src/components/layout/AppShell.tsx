import styled from "styled-components";

export const AppShellContainer = styled.div`
  display: grid;
  grid-template-columns: 64px 1fr;
  min-height: 100vh;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
    padding-left: 0;
  }
`;

export const MainContent = styled.section`
  padding: 1rem;
  overflow-x: hidden;
`;
