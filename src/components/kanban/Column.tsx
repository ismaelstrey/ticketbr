"use client";

import React from "react";
import styled from "styled-components";
import { Ticket } from "@/types/ticket";
import { TicketCard } from "./TicketCard";

const ColumnContainer = styled.article<{ $isDragOver: boolean }>`
  background: ${({ theme, $isDragOver }) => 
    $isDragOver ? theme.colors.column.dragOver : theme.colors.column.background};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: 0.6rem;
  min-height: 500px;
  border: 2px dashed ${({ theme, $isDragOver }) => 
    $isDragOver ? theme.colors.column.dragBorder : "transparent"};
  transition: border-color 0.15s ease, background-color 0.15s ease;
  display: flex;
  flex-direction: column;
`;

const Header = styled.header<{ $color?: string }>`
  border-radius: 10px;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 1rem;
  background-color: ${({ $color }) => $color || "#ccc"};
  
  h2, p {
    margin: 0;
    text-transform: uppercase;
    font-weight: 700;
  }
`;

const IconWrapper = styled.span`
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
`;

const CardsList = styled.div`
  margin-top: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  flex: 1;
`;

const EmptyMessage = styled.p`
  margin: 0;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: 0.9rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.9rem;
  text-align: center;
`;

interface ColumnProps {
  columnKey: string;
  title: string;
  color: string;
  icon: React.ElementType;
  tickets: Ticket[];
  isDragOver: boolean;
  onDragOver: (event: React.DragEvent<HTMLElement>, columnKey: string) => void;
  onDrop: (event: React.DragEvent<HTMLElement>, columnKey: string) => void;
  onDragLeave: (event: React.DragEvent<HTMLElement>) => void;
  onTicketDragStart: (event: React.DragEvent<HTMLElement>, ticketId: string) => void;
  onTicketDragEnd: () => void;
  onOpenTicket: (ticketId: string) => void;
}

export function KanbanColumn({
  columnKey,
  title,
  color,
  icon: Icon,
  tickets,
  isDragOver,
  onDragOver,
  onDrop,
  onDragLeave,
  onTicketDragStart,
  onTicketDragEnd,
  onOpenTicket
}: ColumnProps) {
  return (
    <ColumnContainer
      $isDragOver={isDragOver}
      onDragOver={(e) => onDragOver(e, columnKey)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, columnKey)}
    >
      <Header $color={color}>
        <div>
          <h2>{title}</h2>
          <p>{tickets.length}</p>
        </div>
        <IconWrapper>
          <Icon aria-hidden="true" />
        </IconWrapper>
      </Header>

      <CardsList>
        {tickets.length > 0 ? (
          tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onDragStart={onTicketDragStart}
              onDragEnd={onTicketDragEnd}
              onOpen={onOpenTicket}
            />
          ))
        ) : (
          <EmptyMessage>Sem tickets para os filtros selecionados.</EmptyMessage>
        )}
      </CardsList>
    </ColumnContainer>
  );
}
