"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Task } from "@/types/task";
import { formatDateTimePtBR } from "@/components/tasks/task-format";

export function TasksAlertsModal(props: {
  isOpen: boolean;
  onClose: () => void;
  dueSoon: Task[];
  overdue: Task[];
  onOpenTask: (id: string) => void;
}) {
  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} title="Alertas de vencimento">
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 800 }}>Vencendo em 24h ({props.dueSoon.length})</div>
        {props.dueSoon.length ? (
          props.dueSoon.slice(0, 200).map((t) => (
            <Card key={t.id} style={{ padding: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <div style={{ fontWeight: 800 }}>{t.title}</div>
                <Button type="button" variant="ghost" onClick={() => props.onOpenTask(t.id)}>
                  Abrir
                </Button>
              </div>
              <div style={{ opacity: 0.8, fontSize: 13, marginTop: 4 }}>Vence: {formatDateTimePtBR(t.dueAt)}</div>
            </Card>
          ))
        ) : (
          <div style={{ opacity: 0.8 }}>Nenhuma tarefa vencendo.</div>
        )}

        <div style={{ fontWeight: 800, marginTop: 10 }}>Vencidas ({props.overdue.length})</div>
        {props.overdue.length ? (
          props.overdue.slice(0, 200).map((t) => (
            <Card key={t.id} style={{ padding: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <div style={{ fontWeight: 800 }}>{t.title}</div>
                <Button type="button" variant="ghost" onClick={() => props.onOpenTask(t.id)}>
                  Abrir
                </Button>
              </div>
              <div style={{ opacity: 0.8, fontSize: 13, marginTop: 4, color: "#F87171" }}>Venceu: {formatDateTimePtBR(t.dueAt)}</div>
            </Card>
          ))
        ) : (
          <div style={{ opacity: 0.8 }}>Nenhuma tarefa vencida.</div>
        )}
      </div>
    </Modal>
  );
}

