"use client";

import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { FiX, FiCheck, FiSave, FiBold, FiItalic, FiList, FiLink, FiCode, FiEye, FiEdit2, FiMaximize, FiMinimize, FiImage } from "react-icons/fi";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { Ticket } from "@/types/ticket";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
  padding: 1rem;
`;

const ModalContainer = styled.div<{ $isFullScreen: boolean }>`
  background: #fff;
  border-radius: 8px;
  width: 100%;
  max-width: ${({ $isFullScreen }) => ($isFullScreen ? "95vw" : "800px")};
  height: ${({ $isFullScreen }) => ($isFullScreen ? "95vh" : "auto")};
  min-height: ${({ $isFullScreen }) => ($isFullScreen ? "95vh" : "500px")};
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  overflow: hidden;
  transition: all 0.2s ease-in-out;
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

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  button {
    background: none;
    border: none;
    cursor: pointer;
    color: #666;
    font-size: 1.2rem;
    padding: 0.2rem;
    display: flex;
    align-items: center;
    border-radius: 4px;
    
    &:hover {
      color: #333;
      background: #f5f5f5;
    }
  }
`;

const Toolbar = styled.div`
  padding: 0.5rem 1rem;
  border-bottom: 1px solid #eee;
  display: flex;
  gap: 0.5rem;
  background: #f9fafb;
  flex-wrap: wrap;

  button {
    background: none;
    border: 1px solid transparent;
    cursor: pointer;
    color: #555;
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.3rem;

    &:hover {
      background: #e5e7eb;
      color: #111;
    }

    &.active {
      background: #e5e7eb;
      color: #3b82f6;
      border-color: #d1d5db;
    }
  }

  .divider {
    width: 1px;
    background: #ddd;
    margin: 0 0.2rem;
  }
`;

const EditorContainer = styled.div<{ $splitView: boolean }>`
  flex: 1;
  display: grid;
  grid-template-columns: ${({ $splitView }) => ($splitView ? "1fr 1fr" : "1fr")};
  overflow: hidden;
  position: relative;
`;

const TextArea = styled.textarea<{ $visible: boolean }>`
  display: ${({ $visible }) => ($visible ? "block" : "none")};
  width: 100%;
  height: 100%;
  padding: 1rem;
  border: none;
  font-family: 'Fira Code', monospace;
  font-size: 0.95rem;
  line-height: 1.5;
  resize: none;
  outline: none;
  background: #fff;
  color: #333;
`;

const PreviewArea = styled.div<{ $visible: boolean }>`
  display: ${({ $visible }) => ($visible ? "block" : "none")};
  width: 100%;
  height: 100%;
  padding: 1rem;
  overflow-y: auto;
  background: #fff;
  border-left: 1px solid #eee;
  color: #374151;

  /* Markdown Styles */
  h1, h2, h3, h4, h5, h6 { margin-top: 1em; margin-bottom: 0.5em; font-weight: 600; }
  h1 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
  h2 { font-size: 1.3em; }
  p { margin-bottom: 1em; line-height: 1.6; }
  ul, ol { padding-left: 1.5em; margin-bottom: 1em; }
  blockquote { border-left: 4px solid #ddd; padding-left: 1em; color: #666; margin-left: 0; }
  code { background: #f3f4f6; padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; font-size: 0.9em; }
  pre { background: #1f2937; color: #f9fafb; padding: 1em; border-radius: 6px; overflow-x: auto; margin-bottom: 1em; }
  pre code { background: transparent; padding: 0; color: inherit; }
  a { color: #3b82f6; text-decoration: none; &:hover { text-decoration: underline; } }
  img { max-width: 100%; border-radius: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
  th, td { border: 1px solid #ddd; padding: 0.5em; text-align: left; }
  th { background: #f9fafb; }
`;

const StatusBar = styled.div`
  padding: 0.5rem 1rem;
  background: #fff;
  border-top: 1px solid #eee;
  font-size: 0.8rem;
  color: #666;
  display: flex;
  justify-content: space-between;
`;

const Footer = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 0.8rem;
  background: #f9fafb;
`;

interface NewCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  onCommentAdded: (updatedTicket: Ticket) => void;
}

export default function NewCommentModal({ isOpen, onClose, ticketId, onCommentAdded }: NewCommentModalProps) {
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("edit");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-save logic
  useEffect(() => {
    const saved = localStorage.getItem(`draft_comment_${ticketId}`);
    if (saved && isOpen) setComment(saved);
  }, [isOpen, ticketId]);

  useEffect(() => {
    if (comment) localStorage.setItem(`draft_comment_${ticketId}`, comment);
  }, [comment, ticketId]);

  if (!isOpen) return null;

  const insertFormat = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const newText = before + prefix + selection + suffix + after;
    setComment(newText);
    
    // Restore focus and cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      insertFormat('**', '**');
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      insertFormat('*', '*');
    }
  };

  const handleSubmit = async () => {
    if (!comment.trim()) {
      alert("O comentário não pode estar vazio.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: "Comentário",
        description: comment,
        author: user?.name || "Desconhecido",
        type: "COMMENT"
      };

      const res = await fetch(`/api/tickets/${ticketId}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro ao adicionar comentário");
      }

      const responseData = await res.json();
      const updatedTicket = responseData.data;

      setComment("");
      localStorage.removeItem(`draft_comment_${ticketId}`);
      onCommentAdded(updatedTicket);
      onClose();
    } catch (error: any) {
      console.error("Erro ao adicionar comentário:", error);
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const wordCount = comment.trim().split(/\s+/).filter(w => w.length > 0).length;
  const charCount = comment.length;

  return (
    <Overlay>
      <ModalContainer $isFullScreen={isFullScreen}>
        <Header>
          <h2>Novo comentário</h2>
          <div className="actions">
            <button onClick={() => setIsFullScreen(!isFullScreen)} title={isFullScreen ? "Sair da tela cheia" : "Tela cheia"}>
              {isFullScreen ? <FiMinimize /> : <FiMaximize />}
            </button>
            <button onClick={onClose} title="Fechar"><FiX /></button>
          </div>
        </Header>
        
        <Toolbar>
          <button onClick={() => insertFormat('**', '**')} title="Negrito (Ctrl+B)"><FiBold /></button>
          <button onClick={() => insertFormat('*', '*')} title="Itálico (Ctrl+I)"><FiItalic /></button>
          <div className="divider" />
          <button onClick={() => insertFormat('- ')} title="Lista"><FiList /></button>
          <button onClick={() => insertFormat('[Texto](url)')} title="Link"><FiLink /></button>
          <button onClick={() => insertFormat('![Alt](url)')} title="Imagem"><FiImage /></button>
          <button onClick={() => insertFormat('`', '`')} title="Código Inline"><FiCode /></button>
          <div className="divider" />
          
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <button 
              className={viewMode === 'edit' ? 'active' : ''} 
              onClick={() => setViewMode('edit')}
              title="Editar"
            >
              <FiEdit2 /> Editor
            </button>
            <button 
              className={viewMode === 'split' ? 'active' : ''} 
              onClick={() => setViewMode('split')}
              title="Dividir Tela"
            >
              <FiCheck /> Split
            </button>
            <button 
              className={viewMode === 'preview' ? 'active' : ''} 
              onClick={() => setViewMode('preview')}
              title="Visualizar"
            >
              <FiEye /> Preview
            </button>
          </div>
        </Toolbar>

        <EditorContainer $splitView={viewMode === 'split'}>
          <TextArea 
            ref={textareaRef}
            $visible={viewMode !== 'preview'}
            placeholder="Digite seu comentário em Markdown..." 
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <PreviewArea $visible={viewMode !== 'edit'}>
            {comment ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{comment}</ReactMarkdown>
            ) : (
              <p style={{ color: '#999', fontStyle: 'italic' }}>A pré-visualização aparecerá aqui...</p>
            )}
          </PreviewArea>
        </EditorContainer>

        <StatusBar>
          <span>Markdown Suportado</span>
          <span>{wordCount} palavras | {charCount} caracteres</span>
        </StatusBar>

        <Footer>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>
            <FiSave /> {loading ? "Enviando..." : "Publicar Comentário"}
          </Button>
        </Footer>
      </ModalContainer>
    </Overlay>
  );
}
