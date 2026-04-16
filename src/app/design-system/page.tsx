"use client";

import React, { useMemo, useState } from "react";
import styled, { useTheme } from "styled-components";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { FiCheckCircle, FiAlertCircle } from "@/components/icons";

const Container = styled.div`
  padding: ${({ theme }) => theme.spacing[8]};
  display: grid;
  gap: ${({ theme }) => theme.spacing[8]};
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: ${({ theme }) => theme.spacing[4]};
    gap: ${({ theme }) => theme.spacing[6]};
  }
`;

const Header = styled.header`
  display: grid;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size["2xl"]};
  font-weight: ${({ theme }) => theme.typography.weight.extrabold};
  color: ${({ theme }) => theme.tokens.color.text.primary};
`;

const PageSub = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.tokens.color.text.secondary};
`;

const Section = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const Title = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.xl};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.tokens.color.text.primary};
  border-bottom: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  padding-bottom: ${({ theme }) => theme.spacing[2]};
`;

const SubTitle = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.md};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`;

const Flex = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
  align-items: center;
`;

const ColorSwatch = styled.div<{ $color: string }>`
  width: 100%;
  height: 80px;
  background: ${({ $color }) => $color};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  display: grid;
  place-items: center;
  color: ${({ theme }) => theme.tokens.color.text.inverse};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const FormStack = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing[4]};
  max-width: 640px;
`;

const Field = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const Label = styled.label`
  color: ${({ theme }) => theme.tokens.color.text.secondary};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
`;

const ErrorHint = styled.span`
  color: ${({ theme }) => theme.tokens.color.status.warning};
  font-size: ${({ theme }) => theme.typography.size.sm};
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const CardText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.tokens.color.text.secondary};
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
`;

export default function DesignSystemPage() {
  const theme = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const swatches = useMemo(
    () => [
      { label: "Interactive / Primary", value: theme.tokens.color.interactive.primary },
      { label: "Surface", value: theme.tokens.color.bg.surface },
      { label: "Success", value: theme.tokens.color.status.success },
      { label: "Warning", value: theme.tokens.color.status.warning },
      { label: "Info", value: theme.tokens.color.status.info }
    ],
    [theme]
  );

  return (
    <AppLayout>
      <Container>
          <Header>
            <PageTitle>Design System</PageTitle>
            <PageSub>
              Referência visual e técnica dos componentes base, tokens semânticos e estados de interface do TicketBR.
            </PageSub>
          </Header>

          <Section>
            <Title>Tokens de cor</Title>
            <Grid>
              {swatches.map((swatch) => (
                <div key={swatch.label}>
                  <SubTitle>{swatch.label}</SubTitle>
                  <ColorSwatch $color={swatch.value}>{swatch.value}</ColorSwatch>
                </div>
              ))}
            </Grid>
          </Section>

          <Section>
            <Title>Botões</Title>
            <Flex>
              <Button variant="primary">Primary</Button>
              <Button variant="pill">Pill</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="primary" disabled>
                Disabled
              </Button>
              <Button variant="primary">
                <FiCheckCircle aria-hidden="true" />
                Com ícone
              </Button>
            </Flex>
          </Section>

          <Section>
            <Title>Formulários</Title>
            <FormStack>
              <Field>
                <Label htmlFor="ds-input">Input texto</Label>
                <Input
                  id="ds-input"
                  placeholder="Digite algo..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
              </Field>
              <Field>
                <Label htmlFor="ds-select">Select</Label>
                <Select id="ds-select" defaultValue="1">
                  <option value="1">Opção 1</option>
                  <option value="2">Opção 2</option>
                  <option value="3">Opção 3</option>
                </Select>
              </Field>
              <Field>
                <Label htmlFor="ds-textarea">Textarea</Label>
                <Textarea id="ds-textarea" placeholder="Digite um texto longo..." rows={4} />
              </Field>
              <Field>
                <Label htmlFor="ds-error">Input com erro</Label>
                <Input id="ds-error" aria-invalid="true" placeholder="Campo obrigatório..." />
                <ErrorHint>
                  <FiAlertCircle aria-hidden="true" /> Campo obrigatório
                </ErrorHint>
              </Field>
            </FormStack>
          </Section>

          <Section>
            <Title>Cards e badges</Title>
            <Grid>
              <Card>
                <SubTitle>Card de contexto</SubTitle>
                <CardText>Componente para agrupar informação com hierarquia e leitura rápida.</CardText>
                <Flex>
                  <Badge>Normal</Badge>
                  <Badge priority="Média">Média</Badge>
                  <Badge priority="Alta">Alta</Badge>
                </Flex>
              </Card>
              <Card>
                <SubTitle>Card com ação</SubTitle>
                <CardText>Use ações diretas apenas quando relevantes ao fluxo principal.</CardText>
                <Button variant="ghost">Ver detalhes</Button>
              </Card>
            </Grid>
          </Section>

          <Section>
            <Title>Modal</Title>
            <Flex>
              <Button onClick={() => setModalOpen(true)}>Abrir modal de exemplo</Button>
            </Flex>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Confirmação de ação">
              <FormStack>
                <CardText>
                  Este modal demonstra uso padrão com tokens globais, foco por teclado e fechamento por ESC.
                </CardText>
                <ModalActions>
                  <Button variant="ghost" onClick={() => setModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button variant="primary" onClick={() => setModalOpen(false)}>
                    Confirmar
                  </Button>
                </ModalActions>
              </FormStack>
            </Modal>
          </Section>
        </Container>
    </AppLayout>
  );
}

