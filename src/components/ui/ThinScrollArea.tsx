"use client";

import styled from "styled-components";

export const ThinScrollArea = styled.div<{ $maxHeight?: string }>`
  max-height: ${({ $maxHeight }) => $maxHeight ?? "100%"};
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.25) transparent;

  &::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.25);
    border-radius: 999px;
  }

  &:hover::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.45);
  }
`;

