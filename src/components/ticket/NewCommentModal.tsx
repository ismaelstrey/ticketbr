"use client";

import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { FiCheck, FiSave, FiBold, FiItalic, FiList, FiLink, FiCode, FiEye, FiEdit2, FiMaximize, FiMinimize, FiImage } from "react-icons/fi";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Ticket } from "@/types/ticket";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const Body = styled.div<{ $isFullScreen: boolean }>`
  width: 100%;
  max-width: ${({ $isFullScreen }) => ($isFullScreen ? "min(1100px, 95vw)" : "800px")};
  height: ${({ $isFullScreen }) => ($isFullScreen ? "min(95vh, 900px)" : "auto")};
  min-height: ${({ $isFullScreen }) => ($isFullScreen ? "min(95vh, 900px)" : "520px")};
  display: flex;
  flex-direction: column;
`;

const HeaderActions = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;

  button {
    background: transparent;
    border: 1px solid ${({ theme }) => theme.colors.border};
    cursor: pointer;
    color: ${({ theme }) => theme.colors.text.muted};
    font-size: 1.05rem;
    padding: 0.35rem;
    display: inline-flex;
    align-items: center;
    border-radius: 10px;
    transition: background 200ms ease, color 200ms ease, border-color 200ms ease;

    &:hover {
      color: ${({ theme }) => theme.colors.text.primary};
      background: ${({ theme }) => theme.colors.surface};
      border-color: ${({ theme }) => theme.colors.border};
    }
  }
`;

const Toolbar = styled.div`
  padding: 0.65rem 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  display: flex;
  gap: 0.5rem;
  background: ${({ theme }) => theme.colors.surfaceElevated};
  flex-wrap: wrap;
  transition: background 200ms ease, border-color 200ms ease;

  button {
    background: none;
    border: 1px solid transparent;
    cursor: pointer;
    color: ${({ theme }) => theme.colors.text.muted};
    padding: 0.3rem 0.5rem;
    border-radius: 10px;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    transition: background 200ms ease, color 200ms ease, border-color 200ms ease;

    &:hover {
      background: ${({ theme }) => theme.colors.surface};
      color: ${({ theme }) => theme.colors.text.primary};
    }

    &.active {
      background: ${({ theme }) => theme.colors.surface};
      color: ${({ theme }) => theme.colors.primary};
      border-color: ${({ theme }) => theme.colors.border};
    }
  }

  .divider {
    width: 1px;
    background: ${({ theme }) => theme.colors.border};
    margin: 0 0.2rem;
  }
`;

const EditorContainer = styled.div<{ $splitView: boolean }>`
  flex: 1;
  display: grid;
  grid-template-columns: ${({ $splitView }) => ($splitView ? "1fr 1fr" : "1fr")};
  overflow: hidden;
  position: relative;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  margin-top: 0.75rem;
  background: ${({ theme }) => theme.colors.surfaceElevated};
  transition: background 200ms ease, border-color 200ms ease;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
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
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const PreviewArea = styled.div<{ $visible: boolean }>`
  display: ${({ $visible }) => ($visible ? "block" : "none")};
  width: 100%;
  height: 100%;
  padding: 1rem;
  overflow-y: auto;
  background: transparent;
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.primary};

  /* Markdown Styles */
  h1, h2, h3, h4, h5, h6 { margin-top: 1em; margin-bottom: 0.5em; font-weight: 600; }
  h1 { font-size: 1.5em; border-bottom: 1px solid ${({ theme }) => theme.colors.border}; padding-bottom: 0.3em; }
  h2 { font-size: 1.3em; }
  p { margin-bottom: 1em; line-height: 1.6; }
  ul, ol { padding-left: 1.5em; margin-bottom: 1em; }
  blockquote { border-left: 4px solid ${({ theme }) => theme.colors.border}; padding-left: 1em; color: ${({ theme }) => theme.colors.text.muted}; margin-left: 0; }
  code { background: ${({ theme }) => theme.colors.surface}; padding: 0.2em 0.4em; border-radius: 6px; font-family: monospace; font-size: 0.9em; }
  pre { background: ${({ theme }) => theme.colors.background}; color: ${({ theme }) => theme.colors.text.primary}; padding: 1em; border-radius: 12px; overflow-x: auto; margin-bottom: 1em; border: 1px solid ${({ theme }) => theme.colors.border}; }
  pre code { background: transparent; padding: 0; color: inherit; }
  a { color: ${({ theme }) => theme.colors.primary}; text-decoration: none; &:hover { text-decoration: underline; } }
  img { max-width: 100%; border-radius: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
  th, td { border: 1px solid ${({ theme }) => theme.colors.border}; padding: 0.5em; text-align: left; }
  th { background: ${({ theme }) => theme.colors.surface}; }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    border-left: none;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const StatusBar = styled.div`
  padding: 0.5rem 1rem;
  background: transparent;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.muted};
  display: flex;
  justify-content: space-between;
`;

const Footer = styled.div`
  padding-top: 1rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.8rem;
`;

interface NewCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  onCommentAdded: (updatedTicket: Ticket) => void;
}

export default function NewCommentModal({ isOpen, onClose, ticketId, onCommentAdded }: NewCommentModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
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
      showToast("O comentário não pode estar vazio.", "error");
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
      showToast("Comentário adicionado com sucesso.", "success");
      onClose();
    } catch (error: any) {
      console.error("Erro ao adicionar comentário:", error);
      showToast(`Erro ao adicionar comentário: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const wordCount = comment.trim().split(/\s+/).filter(w => w.length > 0).length;
  const charCount = comment.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo comentário">
      <Body $isFullScreen={isFullScreen}>
        <HeaderActions>
          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            aria-label={isFullScreen ? "Sair da tela cheia" : "Ativar tela cheia"}
          >
            {isFullScreen ? <FiMinimize aria-hidden="true" /> : <FiMaximize aria-hidden="true" />}
          </button>
        </HeaderActions>

        <Toolbar>
          <button type="button" onClick={() => insertFormat("**", "**")} title="Negrito (Ctrl+B)">
            <FiBold aria-hidden="true" />
          </button>
          <button type="button" onClick={() => insertFormat("*", "*")} title="Itálico (Ctrl+I)">
            <FiItalic aria-hidden="true" />
          </button>
          <div className="divider" />
          <button type="button" onClick={() => insertFormat("- ")} title="Lista">
            <FiList aria-hidden="true" />
          </button>
          <button type="button" onClick={() => insertFormat("[Texto](url)")} title="Link">
            <FiLink aria-hidden="true" />
          </button>
          <button type="button" onClick={() => insertFormat("![Alt](url)")} title="Imagem">
            <FiImage aria-hidden="true" />
          </button>
          <button type="button" onClick={() => insertFormat("`", "`")} title="Código Inline">
            <FiCode aria-hidden="true" />
          </button>
          <div className="divider" />

          <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className={viewMode === "edit" ? "active" : ""}
              onClick={() => setViewMode("edit")}
              aria-pressed={viewMode === "edit"}
              title="Editar"
            >
              <FiEdit2 aria-hidden="true" /> Editor
            </button>
            <button
              type="button"
              className={viewMode === "split" ? "active" : ""}
              onClick={() => setViewMode("split")}
              aria-pressed={viewMode === "split"}
              title="Dividir Tela"
            >
              <FiCheck aria-hidden="true" /> Split
            </button>
            <button
              type="button"
              className={viewMode === "preview" ? "active" : ""}
              onClick={() => setViewMode("preview")}
              aria-pressed={viewMode === "preview"}
              title="Visualizar"
            >
              <FiEye aria-hidden="true" /> Preview
            </button>
          </div>
        </Toolbar>

        <EditorContainer $splitView={viewMode === "split"}>
          <TextArea
            ref={textareaRef}
            $visible={viewMode !== "preview"}
            placeholder="Digite seu comentário em Markdown..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <PreviewArea $visible={viewMode !== "edit"}>
            {comment ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{comment}</ReactMarkdown>
            ) : (
              <p style={{ opacity: 0.7, fontStyle: "italic" }}>A pré-visualização aparecerá aqui...</p>
            )}
          </PreviewArea>
        </EditorContainer>

        <StatusBar>
          <span>Markdown suportado</span>
          <span>
            {wordCount} palavras | {charCount} caracteres
          </span>
        </StatusBar>

        <Footer>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>
            <FiSave aria-hidden="true" /> {loading ? "Enviando..." : "Publicar Comentário"}
          </Button>
        </Footer>
      </Body>
    </Modal>
  );
}
