import styled from "styled-components";
import { motion } from "framer-motion";

export const Card = styled(motion.article)`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: 0.9rem;
  box-shadow: ${({ theme }) => theme.shadows.card};
`;
