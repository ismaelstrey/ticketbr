"use client";

import React, { useState, useEffect } from "react";
import styled, { css } from "styled-components";
import { FiX, FiPaperclip, FiClock, FiSave, FiLock, FiBold, FiItalic, FiUnderline, FiList, FiAlignLeft, FiLink, FiImage, FiCode } from "react-icons/fi";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.colors.overlay};
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
`;

const ModalContainer = styled.div`
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 20px;
  width: 100%;
  max-width: 1100px;
  height: 90vh;
  max-height: 800px;
  display: flex;
  flex-direction: column;
  box-shadow: ${({ theme }) => theme.shadows.hover};
  overflow: hidden;
`;

const Header = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;

  h2 {
    font-size: 1.1rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
    margin: 0;
  }

  button {
    background: none;
    border: none;
    cursor: pointer;
    color: ${({ theme }) => theme.colors.text.muted};
    font-size: 1.2rem;
    padding: 0;
    display: flex;
    align-items: center;

    &:hover {
      color: ${({ theme }) => theme.colors.text.primary};
    }
  }
`;

const Content = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 320px;
  overflow: hidden;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
`;

const MainColumn = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: 1.2rem;

  @media (max-width: 900px) {
    border-right: none;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const Sidebar = styled.div`
  padding: 1.5rem;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  label {
    font-size: 0.85rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const fieldErrorStyles = css`
  border-color: ${({ theme }) => theme.colors.status.warning} !important;
  box-shadow: 0 0 0 3px ${({ theme }) => `${theme.colors.status.warning}18`} !important;
`;

const TicketInput = styled(Input)<{ $hasError?: boolean }>`
  ${({ $hasError }) => $hasError && fieldErrorStyles}
`;

const TicketSelect = styled(Select)<{ $hasError?: boolean }>`
  ${({ $hasError }) => $hasError && fieldErrorStyles}
`;

const RichTextEditor = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 200px;
  background: ${({ theme }) => theme.colors.surface};
`;

const Toolbar = styled.div`
  background: ${({ theme }) => theme.colors.surfaceAlt};
  padding: 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  gap: 0.8rem;
  align-items: center;

  button {
    background: none;
    border: none;
    color: ${({ theme }) => theme.colors.text.muted};
    cursor: pointer;
    padding: 2px;
    font-size: 0.9rem;

    &:hover {
      color: ${({ theme }) => theme.colors.text.primary};
    }
  }
`;

const ToolbarDivider = styled.span`
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  margin: 0 4px;
  height: 18px;
`;

const EditorArea = styled.textarea`
  flex: 1;
  border: none;
  padding: 1rem;
  resize: none;
  font-family: inherit;
  outline: none;
  min-height: 150px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const AttachmentArea = styled.div`
  border: 2px dashed ${({ theme }) => theme.colors.borderStrong};
  border-radius: 12px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  svg {
    font-size: 2rem;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const ToggleSwitch = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  label {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  .switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    margin: 0;
  }

  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${({ theme }) => theme.colors.borderStrong};
    transition: .4s;
    border-radius: 34px;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: ${({ theme }) => theme.colors.text.white};
    transition: .4s;
    border-radius: 50%;
  }

  input:checked + .slider {
    background-color: ${({ theme }) => theme.colors.primary};
  }

  input:checked + .slider:before {
    transform: translateX(20px);
  }

  .slider-text {
    position: absolute;
    right: 6px;
    color: white;
    font-size: 10px;
    font-weight: bold;
    top: 50%;
    transform: translateY(-50%);
  }
`;

const Footer = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: flex-end;
  gap: 0.8rem;
`;

const FooterButton = styled(Button)`
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0.6rem 1.2rem;
`;

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  z-index: 10;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const DropdownItem = styled.div`
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.primary};

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
`;

const DropdownMeta = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const EmptyDropdown = styled.div`
  padding: 8px 12px;
  color: ${({ theme }) => theme.colors.text.muted};
  font-style: italic;
`;

const InlineField = styled.div`
  position: relative;
`;

const ClockIcon = styled(FiClock)`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.muted};
`;

const ContactRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ContactLink = styled.span`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: pointer;
  text-decoration: underline;
`;

const ContactIconButton = styled.button`
  border: none;
  background: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.primary};
`;

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => Promise<void> | void;
}

export default function NewTicketModal({ isOpen, onClose, onCreated }: NewTicketModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [requester, setRequester] = useState("");
  const [requesterId, setRequesterId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [followTicket, setFollowTicket] = useState(false);
  const [priority, setPriority] = useState("");
  const [ticketType, setTicketType] = useState("");
  const [category, setCategory] = useState("");
  const [workTable, setWorkTable] = useState("");
  const [operator, setOperator] = useState("");
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [workbenches, setWorkbenches] = useState<any[]>([]);
  const [requesters, setRequesters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRequesterListOpen, setIsRequesterListOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleRequesterSelect = (req: any) => {
    const name = String(req?.nome_fantasia || "").trim();
    setRequester(name);
    setRequesterId(String(req?.id || "").trim());
    setSearchTerm(name);
    setIsRequesterListOpen(false);
  };

  const categories = ticketTypes.find((t) => t.nome === ticketType)?.categorias || [];
  const operators = workbenches.find((w) => w.nome === workTable)?.operadores || [];

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([
        fetch("/api/domain/ticket-types").then((res) => res.json()),
        fetch("/api/domain/workbenches").then((res) => res.json()),
        fetch("/api/domain/requesters").then((res) => res.json())
      ]).then(([typesData, workbenchesData, requestersData]) => {
        const benches = Array.isArray(workbenchesData) ? workbenchesData : [];
        setTicketTypes(Array.isArray(typesData) ? typesData : []);
        setWorkbenches(benches);
        setRequesters(Array.isArray(requestersData) ? requestersData : []);

        if (user && !workTable) {
          const userWorkbench = benches.find((w: any) => w.operadores.some((op: any) => op.nome === user.name));
          if (userWorkbench) {
            setWorkTable(userWorkbench.nome);
            setOperator(user.name);
          }
        }
      }).catch((err) => console.error("Failed to load domain data", err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (workTable && user) {
      const bench = workbenches.find((w) => w.nome === workTable);
      if (bench) {
        const userInBench = bench.operadores.some((op: any) => op.nome === user.name);
        if (userInBench) {
          setOperator(user.name);
        } else {
          setOperator("");
        }
      }
    }
  }, [workTable, user, workbenches]);

  const filteredRequesters = requesters.filter((req) =>
    req.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!requester || !subject || !priority) {
      showToast("Preencha os campos obrigatórios (Solicitante, Assunto, Prioridade).", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        empresa: requester,
        solicitante: requester,
        solicitanteId: requesterId || undefined,
        assunto: subject,
        descricao: description,
        prioridade: priority,
        status: "todo",
        operador: operator,
        tipoTicket: ticketType,
        categoria: category,
        mesaTrabalho: workTable
      };

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro ao criar ticket");
      }

      const data = await res.json();
      console.log("Ticket criado:", data);
      showToast("Ticket criado com sucesso.", "success");
      if (onCreated) await onCreated();
      onClose();
    } catch (error: any) {
      console.error("Erro:", error);
      showToast(`Erro ao criar ticket: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const formattedDate = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  if (!isOpen) return null;

  return (
    <Overlay>
      <ModalContainer>
        <Header>
          <h2>Ticket</h2>
          <button onClick={onClose}><FiX /></button>
        </Header>

        <Content>
          <MainColumn>
            <FormGroup>
              <label>Solicitante</label>
              <InlineField>
                <TicketInput
                  placeholder="Pesquisar solicitante..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsRequesterListOpen(true);
                    setRequester("");
                    setRequesterId("");
                  }}
                  onFocus={() => setIsRequesterListOpen(true)}
                  $hasError={!requester}
                />
                {isRequesterListOpen && (
                  <Dropdown>
                    {filteredRequesters.length > 0 ? (
                      filteredRequesters.map((req: any) => (
                        <DropdownItem key={req.id} onClick={() => handleRequesterSelect(req)}>
                          <strong>{req.nome_fantasia}</strong>
                          <DropdownMeta>{req.email} - {req.cnpj}</DropdownMeta>
                        </DropdownItem>
                      ))
                    ) : (
                      <EmptyDropdown>Nenhum solicitante encontrado.</EmptyDropdown>
                    )}
                  </Dropdown>
                )}
              </InlineField>
            </FormGroup>

            <FormGroup>
              <label>Assunto</label>
              <TicketInput placeholder="Assunto" $hasError={!subject} value={subject} onChange={(e) => setSubject(e.target.value)} />
            </FormGroup>

            <FormGroup>
              <label>Descrição</label>
              <RichTextEditor>
                <Toolbar>
                  <button type="button"><FiBold /></button>
                  <button type="button"><FiItalic /></button>
                  <button type="button"><FiUnderline /></button>
                  <ToolbarDivider />
                  <button type="button"><FiList /></button>
                  <button type="button"><FiAlignLeft /></button>
                  <ToolbarDivider />
                  <button type="button"><FiLink /></button>
                  <button type="button"><FiCode /></button>
                  <button type="button"><FiImage /></button>
                </Toolbar>
                <EditorArea placeholder="Insira/cole seu texto ou imagem aqui." value={description} onChange={(e) => setDescription(e.target.value)} />
              </RichTextEditor>
            </FormGroup>

            <FormGroup>
              <label>Anexo</label>
              <AttachmentArea>
                <FiPaperclip />
                <span>Clique ou arraste um arquivo</span>
              </AttachmentArea>
            </FormGroup>
          </MainColumn>

          <Sidebar>
            <ToggleSwitch>
              <label>Seguir o ticket</label>
              <label className="switch">
                <input type="checkbox" checked={followTicket} onChange={(e) => setFollowTicket(e.target.checked)} />
                <span className="slider">
                  <span className="slider-text">{followTicket ? "Sim" : "Não"}</span>
                </span>
              </label>
            </ToggleSwitch>

            <FormGroup>
              <label>Data de criação</label>
              <InlineField>
                <TicketInput value={formattedDate} readOnly />
                <ClockIcon />
              </InlineField>
            </FormGroup>

            <FormGroup>
              <label>Prioridade</label>
              <TicketSelect value={priority} onChange={(e) => setPriority(e.target.value)} $hasError={!priority}>
                <option value="" disabled>Selecione</option>
                <option value="Alta">Alta</option>
                <option value="Média">Média</option>
                <option value="Sem prioridade">Sem prioridade</option>
              </TicketSelect>
            </FormGroup>

            <FormGroup>
              <label>Contatos</label>
              <ContactRow>
                <ContactLink>Adicionar contato</ContactLink>
                <ContactIconButton>👤</ContactIconButton>
              </ContactRow>
            </FormGroup>

            <FormGroup>
              <label>Tipo de Ticket</label>
              <TicketSelect value={ticketType} onChange={(e) => { setTicketType(e.target.value); setCategory(""); }}>
                <option value="" disabled>Selecione</option>
                {ticketTypes.map((t: any) => (
                  <option key={t.id} value={t.nome}>{t.nome}</option>
                ))}
              </TicketSelect>
            </FormGroup>

            <FormGroup>
              <label>Categorias</label>
              <TicketSelect value={category} onChange={(e) => setCategory(e.target.value)} disabled={!ticketType}>
                <option value="" disabled>Selecione</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.nome}>{c.nome}</option>
                ))}
              </TicketSelect>
            </FormGroup>

            <FormGroup>
              <label>Mesa de Trabalho</label>
              <TicketSelect value={workTable} onChange={(e) => { setWorkTable(e.target.value); setOperator(""); }}>
                <option value="" disabled>Selecione</option>
                {workbenches.map((w: any) => (
                  <option key={w.id} value={w.nome}>{w.nome}</option>
                ))}
              </TicketSelect>
            </FormGroup>

            <FormGroup>
              <label>Operador</label>
              <TicketSelect value={operator} onChange={(e) => setOperator(e.target.value)} disabled={!workTable}>
                <option value="" disabled>Selecione</option>
                {operators.map((op: any) => (
                  <option key={op.id} value={op.nome}>{op.nome}</option>
                ))}
              </TicketSelect>
            </FormGroup>
          </Sidebar>
        </Content>

        <Footer>
          <FooterButton type="button" onClick={handleSubmit} disabled={loading} variant="ghost">
            <FiSave style={{ marginRight: "5px" }} />
            {loading ? "Salvando..." : "Salvar e Abrir"}
          </FooterButton>
          <FooterButton type="button" disabled={loading} variant="primary">
            <FiLock style={{ marginRight: "5px" }} /> Abrir ticket
          </FooterButton>
        </Footer>
      </ModalContainer>
    </Overlay>
  );
}
