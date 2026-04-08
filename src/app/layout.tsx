import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { ChatOpenConversationsProvider } from "@/context/ChatOpenConversationsContext";
import StyledComponentsRegistry from "@/lib/registry";
import { GlobalChatButton } from "@/components/layout/GlobalChatButton";
import { StyledComponentsProvider } from "@/styles/StyledComponentsProvider";

const appUrl = "https://ticketbr.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "TicketBR | Ordem de Serviço",
  description: "Sistema de tickets com quadro Kanban para ordens de serviço",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "TicketBR | Ordem de Serviço",
    description: "Sistema de tickets com quadro Kanban para ordens de serviço",
    url: appUrl,
    siteName: "TicketBR",
    locale: "pt_BR",
    type: "website"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <StyledComponentsRegistry>
          <StyledComponentsProvider>
            <AuthProvider>
              <ToastProvider>
                <ChatOpenConversationsProvider pollIntervalMs={10000000}>
                  {children}
                  <GlobalChatButton />
                </ChatOpenConversationsProvider>
              </ToastProvider>
            </AuthProvider>
          </StyledComponentsProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
