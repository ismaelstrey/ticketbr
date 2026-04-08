"use client";

import styled from "styled-components";

export const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const Title = styled.h1`
  margin: 0;
  font-size: 1.15rem;
  font-weight: 900;
`;

export const Layout = styled.div`
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 1rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

export const Label = styled.div`
  font-size: 0.78rem;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 0.35rem;
`;

