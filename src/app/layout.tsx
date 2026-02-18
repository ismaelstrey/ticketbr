import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import StyledComponentsRegistry from "@/lib/registry";
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
    <html lang="pt-BR">
      <body>
        <StyledComponentsRegistry>
          <StyledComponentsProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </StyledComponentsProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
