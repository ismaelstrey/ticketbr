"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { AppShellContainer, MainContent } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { useThemeMode } from "@/context/ThemeModeContext";

interface SyncedContact {
  id: string;
  remoteJid: string;
  pushName: string | null;
  profilePicUrl: string | null;
  createdAt: string;
  updatedAt: string;
  instanceId: string | null;
}

const Card = styled.section`
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.card};
  border-radius: 24px;
  padding: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  transition: background 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const HeaderMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const Title = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Subtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  align-items: center;
`;

const ThemeSwitch = styled.button<{ $active: boolean }>`
  width: 68px;
  height: 38px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme, $active }) => ($active ? `${theme.colors.primary}22` : theme.colors.surface)};
  border-radius: 999px;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: ${({ $active }) => ($active ? "flex-end" : "flex-start")};
  transition: all 0.25s ease;

  span {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.surfaceAlt)};
    color: ${({ theme }) => theme.colors.text.primary};
    box-shadow: ${({ theme }) => theme.shadows.card};
    font-size: 0.9rem;
  }
`;

const SearchBar = styled.div`
  margin-bottom: 0.9rem;
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const ContactsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;

  th,
  td {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    text-align: left;
    padding: 0.55rem;
    font-size: 0.84rem;
    vertical-align: top;
    color: ${({ theme }) => theme.colors.text.secondary};
    transition: border-color 0.25s ease, color 0.25s ease, background 0.25s ease;
  }

  th {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
`;

export default function WhatsAppContatosPage() {
  const { showToast } = useToast();
  const { isDark, toggleMode } = useThemeMode();
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<SyncedContact[]>([]);
  const [search, setSearch] = useState("");

  const loadContacts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings/contacts?limit=1000");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erro ao carregar contatos");
      setContacts(Array.isArray(json?.data) ? json.data : []);
    } catch (error: any) {
      showToast(error?.message ?? "Erro ao carregar contatos", "error");
    } finally {
      setLoading(false);
    }
  };

  const syncContacts = async () => {
    try {
      setSyncing(true);
      const res = await fetch("/api/settings/contacts/sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao sincronizar contatos");
      showToast("Contatos sincronizados com sucesso", "success");
      await loadContacts();
    } catch (error: any) {
      showToast(error?.message ?? "Erro ao sincronizar contatos", "error");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadContacts().catch(() => undefined);
  }, []);

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contacts;

    return contacts.filter((contact) => {
      const name = (contact.pushName || "").toLowerCase();
      const remoteJid = (contact.remoteJid || "").toLowerCase();
      const instanceId = (contact.instanceId || "").toLowerCase();
      return name.includes(query) || remoteJid.includes(query) || instanceId.includes(query);
    });
  }, [contacts, search]);

  return (
    <AppShellContainer>
      <Sidebar />
      <MainContent>
        <Card>
          <Header>
            <HeaderMeta>
              <Title>Contatos WhatsApp</Title>
              <Subtitle>Lista de contatos sincronizados.</Subtitle>
            </HeaderMeta>

            <HeaderActions>
              <ThemeSwitch
                type="button"
                $active={isDark}
                onClick={toggleMode}
                aria-label={isDark ? "Desativar dark mode" : "Ativar dark mode"}
                aria-pressed={isDark}
              >
                <span>{isDark ? "🌙" : "☀️"}</span>
              </ThemeSwitch>
              <Button onClick={syncContacts} disabled={syncing}>
                {syncing ? "Sincronizando..." : "Sincronizar contatos"}
              </Button>
            </HeaderActions>
          </Header>

          {loading ? (
            <p>Carregando contatos...</p>
          ) : (
            <>
              <SearchBar>
                <Input
                  placeholder="Buscar por nome, WhatsApp ou instância"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </SearchBar>
              <TableWrapper>
                <ContactsTable>
                  <thead>
                  <tr>
                    <th>Nome</th>
                    <th>WhatsApp</th>
                    <th>Instância</th>
                    <th>Atualizado em</th>
                  </tr>
                  </thead>
                  <tbody>
                  {filteredContacts.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ color: "inherit" }}>
                        {contacts.length === 0 ? "Nenhum contato sincronizado." : "Nenhum contato encontrado para a busca."}
                      </td>
                    </tr>
                  ) : (
                    filteredContacts.map((contact) => (
                      <tr key={contact.id}>
                        <td>{contact.pushName || "Sem nome"}</td>
                        <td>{contact.remoteJid}</td>
                        <td>{contact.instanceId || "-"}</td>
                        <td>{new Date(contact.updatedAt).toLocaleString("pt-BR")}</td>
                      </tr>
                    ))
                  )}
                  </tbody>
                </ContactsTable>
              </TableWrapper>
            </>
          )}
        </Card>
      </MainContent>
    </AppShellContainer>
  );
}
