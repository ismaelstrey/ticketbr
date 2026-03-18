import styled from "styled-components";

export const AppShellContainer = styled.div`
  display: flex;
  min-height: 100vh;
  width: 100%;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0)),
    ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  transition: background 0.25s ease, color 0.25s ease;
`;

export const MainContent = styled.section`
  flex: 1;
  min-width: 0;
  padding: 1rem;
  overflow-x: hidden;
`;
