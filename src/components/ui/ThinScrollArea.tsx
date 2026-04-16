"use client";

import styled from "styled-components";

export const ThinScrollArea = styled.div<{ $maxHeight?: string }>`
  max-height: ${({ $maxHeight }) => $maxHeight ?? "100%"};
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => `${theme.tokens.color.border.default}`} transparent;

  &::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.tokens.color.border.default};
    border-radius: 999px;
  }

  &:hover::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.tokens.color.border.strong};
  }
`;

