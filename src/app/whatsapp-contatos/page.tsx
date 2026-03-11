"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { AppShellContainer, MainContent } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";

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
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const SearchBar = styled.div`
  margin-bottom: 0.9rem;
`;

const ContactsTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    border-bottom: 1px solid #e5e7eb;
    text-align: left;
    padding: 0.55rem;
    font-size: 0.84rem;
    vertical-align: top;
  }
`;

export default function WhatsAppContatosPage() {
  const { showToast } = useToast();
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
            <div>
              <h2 style={{ margin: 0 }}>Contatos WhatsApp</h2>
              <p style={{ margin: "0.4rem 0 0", color: "#6b7280" }}>
                Lista de contatos sincronizados do endpoint n8n.
              </p>
            </div>
            <Button onClick={syncContacts} disabled={syncing}>
              {syncing ? "Sincronizando..." : "Sincronizar contatos"}
            </Button>
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
                    <td colSpan={4} style={{ color: "#6b7280" }}>
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
            </>
          )}
        </Card>
      </MainContent>
    </AppShellContainer>
  );
}
