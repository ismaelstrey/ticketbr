"use client";

import React, { useState } from "react";
import styled from "styled-components";
import { FiX, FiPaperclip, FiClock, FiSave, FiLock, FiBold, FiItalic, FiUnderline, FiList, FiAlignLeft, FiLink, FiImage, FiCode } from "react-icons/fi";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
`;

const ModalContainer = styled.div`
  background: #fff;
  border-radius: 8px;
  width: 100%;
  max-width: 1100px;
  height: 90vh;
  max-height: 800px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  overflow: hidden;
`;

const Header = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;

  h2 {
    font-size: 1.1rem;
    font-weight: 700;
    color: #333;
    margin: 0;
  }

  button {
    background: none;
    border: none;
    cursor: pointer;
    color: #666;
    font-size: 1.2rem;
    padding: 0;
    display: flex;
    align-items: center;
    
    &:hover {
      color: #333;
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
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;

  @media (max-width: 900px) {
    border-right: none;
    border-bottom: 1px solid #eee;
  }
`;

const Sidebar = styled.div`
  padding: 1.5rem;
  background: #fcfcfc;
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
    color: #444;
  }
`;

const ErrorInputStyle = {
  borderBottom: "2px solid #ef4444",
  borderTop: "1px solid #ddd",
  borderLeft: "1px solid #ddd",
  borderRight: "1px solid #ddd",
  borderRadius: "4px"
};

const RichTextEditor = styled.div`
  border: 1px solid #ddd;
  border-bottom: 2px solid #ef4444; /* Error style from image */
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 200px;
`;

const Toolbar = styled.div`
  background: #f5f5f5;
  padding: 0.5rem;
  border-bottom: 1px solid #ddd;
  display: flex;
  gap: 0.8rem;
  
  button {
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    padding: 2px;
    font-size: 0.9rem;
    
    &:hover {
      color: #333;
    }
  }
`;

const EditorArea = styled.textarea`
  flex: 1;
  border: none;
  padding: 1rem;
  resize: none;
  font-family: inherit;
  outline: none;
  min-height: 150px;
`;

const AttachmentArea = styled.div`
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #888;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f9f9f9;
    border-color: #ccc;
  }

  svg {
    font-size: 2rem;
    color: #999;
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
    color: #444;
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
    background-color: #ccc;
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
    background-color: white;
    transition: .4s;
    border-radius: 50%;
  }

  input:checked + .slider {
    background-color: #2196F3;
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
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 0.8rem;
`;

const FooterButton = styled(Button)`
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0.6rem 1.2rem;
  
  &.save {
    background-color: #9ca3af; /* Grayish from image */
    color: white;
  }
  
  &.open {
    background-color: #9ca3af;
    color: white;
  }
`;

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewTicketModal({ isOpen, onClose }: NewTicketModalProps) {
  const [requester, setRequester] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [followTicket, setFollowTicket] = useState(false);
  const [priority, setPriority] = useState("");
  const [ticketType, setTicketType] = useState("");
  const [category, setCategory] = useState("");
  const [workTable, setWorkTable] = useState("");
  
  // Format current date
  const now = new Date();
  const formattedDate = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

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
              <Select 
                style={ErrorInputStyle} 
                value={requester} 
                onChange={(e) => setRequester(e.target.value)}
              >
                <option value="" disabled>Selecione ou Pesquise por Nome, CNPJ, CPF, Telefone, Celular ou E-mail</option>
                <option value="1">Cliente Exemplo</option>
                <option value="2">Outro Cliente</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <label>Assunto</label>
              <Input 
                placeholder="Assunto" 
                style={ErrorInputStyle} 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </FormGroup>

            <FormGroup>
              <label>Descrição</label>
              <RichTextEditor>
                <Toolbar>
                  <button type="button"><FiBold /></button>
                  <button type="button"><FiItalic /></button>
                  <button type="button"><FiUnderline /></button>
                  <span style={{ borderLeft: '1px solid #ddd', margin: '0 4px' }}></span>
                  <button type="button"><FiList /></button>
                  <button type="button"><FiAlignLeft /></button>
                  <span style={{ borderLeft: '1px solid #ddd', margin: '0 4px' }}></span>
                  <button type="button"><FiLink /></button>
                  <button type="button"><FiCode /></button>
                  <button type="button"><FiImage /></button>
                </Toolbar>
                <EditorArea 
                  placeholder="Insira/cole seu texto ou imagem aqui." 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
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
                <input 
                  type="checkbox" 
                  checked={followTicket} 
                  onChange={(e) => setFollowTicket(e.target.checked)} 
                />
                <span className="slider">
                    <span className="slider-text">{followTicket ? "Sim" : "Não"}</span>
                </span>
              </label>
            </ToggleSwitch>

            <FormGroup>
              <label>Data de criação</label>
              <div style={{ position: 'relative' }}>
                <Input value={formattedDate} readOnly />
                <FiClock style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
              </div>
            </FormGroup>

            <FormGroup>
              <label>Prioridade</label>
              <Select 
                value={priority} 
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="" disabled>Selecione</option>
                <option value="Alta">Alta</option>
                <option value="Media">Média</option>
                <option value="Baixa">Baixa</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <label>Contatos</label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#666', cursor: 'pointer', textDecoration: 'underline' }}>Adicionar contato</span>
                <button style={{ border: 'none', background: 'none', cursor: 'pointer' }}>👤</button>
              </div>
            </FormGroup>

            <FormGroup>
              <label>Tipo de Ticket</label>
              <Select 
                value={ticketType} 
                onChange={(e) => setTicketType(e.target.value)}
              >
                <option value="" disabled>Selecione</option>
                <option value="Incidente">Incidente</option>
                <option value="Solicitacao">Solicitação</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <label>Categorias</label>
              <Select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="" disabled>Selecione</option>
                <option value="Hardware">Hardware</option>
                <option value="Software">Software</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <label>Mesa de Trabalho</label>
              <Select 
                style={ErrorInputStyle} 
                value={workTable} 
                onChange={(e) => setWorkTable(e.target.value)}
              >
                <option value="" disabled>Selecione</option>
                <option value="N1">Nível 1</option>
                <option value="N2">Nível 2</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <label>Operador</label>
              <Select disabled value="">
                <option value="" disabled>Selecione uma mesa de trabalho antes!</option>
              </Select>
            </FormGroup>
          </Sidebar>
        </Content>

        <Footer>
          <FooterButton className="save" type="button">
            <FiSave style={{ marginRight: '5px' }} /> Salvar e Abrir
          </FooterButton>
          <FooterButton className="open" type="button">
            <FiLock style={{ marginRight: '5px' }} /> Abrir ticket
          </FooterButton>
        </Footer>
      </ModalContainer>
    </Overlay>
  );
}
