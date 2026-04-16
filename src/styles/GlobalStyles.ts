import { createGlobalStyle } from "styled-components";

export const GlobalStyles = createGlobalStyle`
  :root {
    color-scheme: ${({ theme }) => theme.mode};
    font-family: ${({ theme }) => theme.typography.family.body};
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html,
  body {
    min-height: 100%;
  }

  body {
    margin: 0;
    background:
      ${({ theme }) => theme.tokens.color.bg.accent},
      ${({ theme }) => theme.tokens.color.bg.default};
    color: ${({ theme }) => theme.tokens.color.text.primary};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    transition:
      background ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.easing},
      color ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.easing};
  }

  button,
  input,
  select,
  textarea {
    font-family: inherit;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  ::selection {
    background: ${({ theme }) => `${theme.tokens.color.interactive.primary}55`};
    color: ${({ theme }) => theme.tokens.color.text.inverse};
  }

  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.tokens.color.border.strong};
    border-radius: 999px;
    border: 2px solid transparent;
    background-clip: padding-box;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.tokens.color.text.muted};
    border: 2px solid transparent;
    background-clip: padding-box;
  }

  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.tokens.color.interactive.primary};
    outline-offset: 2px;
  }
`;
