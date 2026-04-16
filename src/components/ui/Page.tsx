import styled from "styled-components";

export const PageContainer = styled.main`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  gap: ${({ theme }) => theme.spacing[4]};
`;

export const PageHeader = styled.header`
  display: grid;
  gap: ${({ theme }) => theme.spacing[2]};
`;

export const PageTitle = styled.h1`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size["2xl"]};
  font-weight: ${({ theme }) => theme.typography.weight.extrabold};
  color: ${({ theme }) => theme.tokens.color.text.primary};
`;

export const PageSubtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.tokens.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
`;
