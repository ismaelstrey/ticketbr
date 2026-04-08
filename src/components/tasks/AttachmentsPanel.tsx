"use client";

import React, { useState } from "react";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export type TaskAttachmentMeta = {
  id: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
};

const Title = styled.div`
  font-weight: 800;
  margin-bottom: 0.75rem;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  padding: 0.6rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const FileName = styled.div`
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 420px;
`;

const Muted = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.85rem;
`;

const DownloadLink = styled.a`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.pill};
  padding: 0.62rem 1rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  text-decoration: none;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text.primary};
  transition: opacity 0.2s ease, transform 0.1s ease, background 0.2s ease, border-color 0.2s ease, color 0.2s ease;

  &:active {
    transform: scale(0.98);
  }
`;

function formatSize(bytes: number | null) {
  if (!bytes) return "-";
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function AttachmentsPanel(props: {
  attachments: TaskAttachmentMeta[];
  uploading: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: (attachmentId: string) => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const upload = async (file: File | null) => {
    if (!file) return;
    await props.onUpload(file);
  };

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      await props.onRemove(id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card style={{ padding: "1rem" }}>
      <Title>Anexos</Title>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <input
          type="file"
          onChange={(e) => upload(e.target.files?.[0] ?? null)}
          aria-label="Selecionar arquivo"
        />
        {props.uploading ? <Muted>Enviando...</Muted> : null}
      </div>

      {props.attachments.length ? (
        <div>
          {props.attachments.map((a) => (
            <Row key={a.id}>
              <div style={{ minWidth: 0 }}>
                <FileName>{a.fileName}</FileName>
                <Muted>{formatSize(a.fileSize)}</Muted>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <DownloadLink href={`/api/tasks/attachments/${a.id}`}>Baixar</DownloadLink>
                <Button type="button" variant="ghost" onClick={() => remove(a.id)} disabled={busyId === a.id}>
                  {busyId === a.id ? "Removendo..." : "Remover"}
                </Button>
              </div>
            </Row>
          ))}
        </div>
      ) : (
        <Muted>Nenhum anexo.</Muted>
      )}
    </Card>
  );
}
