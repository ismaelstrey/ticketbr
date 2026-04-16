import styled from "styled-components";
import { motion } from "framer-motion";

export const Card = styled(motion.article)`
  background: ${({ theme }) => theme.tokens.color.bg.surface};
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: ${({ theme }) => theme.spacing[4]};
  box-shadow: ${({ theme }) => theme.shadows.card};
  color: ${({ theme }) => theme.tokens.color.text.primary};
`;
