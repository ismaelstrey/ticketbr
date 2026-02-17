import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TicketBR | Ordem de Serviço",
  description: "Sistema de tickets com quadro Kanban para ordens de serviço"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
