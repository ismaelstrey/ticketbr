"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { Credential, CredentialGrant, Equipment, SharedSecret, UserGroup } from "@/types/inventory";

// Filtros aceitos pela listagem de equipamentos
export type InventoryFilters = {
  page: number;
  pageSize: number;
  search: string;
  type: string;
  status: string;
};

const defaultFilters: InventoryFilters = { page: 1, pageSize: 10, search: "", type: "", status: "" };

/**
 * Hook de listagem e CRUD de equipamentos do inventário.
 */
export function useInventory(initialFilters: Partial<InventoryFilters> = {}) {
  const [filters, setFilters] = useState<InventoryFilters>({ ...defaultFilters, ...initialFilters });
  const [items, setItems] = useState<Equipment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: String(filters.page),
        pageSize: String(filters.pageSize)
      };
      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;

      const res = await api.inventory.list(params);
      setItems(res.data);
      setTotal(res.total);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Falha ao carregar equipamentos";
      setError(message);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  // Cria um equipamento e recarrega a listagem
  const create = useCallback(
    async (payload: Record<string, unknown>) => {
      try {
        await api.inventory.create(payload as Partial<Equipment>);
        showToast("Equipamento cadastrado com sucesso.", "success");
        await load();
        return true;
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Falha ao cadastrar equipamento", "error");
        return false;
      }
    },
    [load, showToast]
  );

  // Atualiza um equipamento existente
  const update = useCallback(
    async (id: string, payload: Record<string, unknown>) => {
      try {
        await api.inventory.update(id, payload as Partial<Equipment>);
        showToast("Equipamento atualizado com sucesso.", "success");
        await load();
        return true;
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Falha ao atualizar equipamento", "error");
        return false;
      }
    },
    [load, showToast]
  );

  // Remove (exclusão lógica) um equipamento
  const remove = useCallback(
    async (id: string) => {
      if (typeof window !== "undefined" && !window.confirm("Deseja realmente excluir este equipamento?")) return false;
      try {
        await api.inventory.remove(id);
        showToast("Equipamento excluído.", "success");
        await load();
        return true;
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Falha ao excluir equipamento", "error");
        return false;
      }
    },
    [load, showToast]
  );

  return { filters, setFilters, items, total, loading, error, reload: load, create, update, remove };
}

/**
 * Hook de detalhe do equipamento com operações do cofre (credenciais, revelação e ACL).
 */
export function useEquipmentDetail(id: string) {
  const [equipment, setEquipment] = useState<(Equipment & { credentials: Credential[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.inventory.get(id);
      setEquipment(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha ao carregar equipamento");
      setEquipment(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Cria uma credencial vinculada a este equipamento
  const createCredential = useCallback(
    async (payload: Record<string, unknown>) => {
      try {
        await api.inventory.credentials.create({ ...payload, equipmentId: id });
        showToast("Credencial cadastrada no cofre.", "success");
        await load();
        return true;
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Falha ao cadastrar credencial", "error");
        return false;
      }
    },
    [id, load, showToast]
  );

  // Atualiza uma credencial (a senha só é alterada quando informada)
  const updateCredential = useCallback(
    async (credentialId: string, payload: Record<string, unknown>) => {
      try {
        await api.inventory.credentials.update(credentialId, payload);
        showToast("Credencial atualizada.", "success");
        await load();
        return true;
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Falha ao atualizar credencial", "error");
        return false;
      }
    },
    [load, showToast]
  );

  // Remove (exclusão lógica) uma credencial
  const removeCredential = useCallback(
    async (credentialId: string) => {
      if (typeof window !== "undefined" && !window.confirm("Deseja realmente excluir esta credencial?")) return false;
      try {
        await api.inventory.credentials.remove(credentialId);
        showToast("Credencial excluída.", "success");
        await load();
        return true;
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Falha ao excluir credencial", "error");
        return false;
      }
    },
    [load, showToast]
  );

  // Revela a senha em texto puro (requer permissão; gera log de auditoria no servidor)
  const revealCredential = useCallback(
    async (credentialId: string) => {
      try {
        const res = await api.inventory.credentials.reveal(credentialId);
        return res.data.secret;
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Sem permissão para ver a senha", "error");
        return null;
      }
    },
    [showToast]
  );

  return {
    equipment,
    loading,
    error,
    reload: load,
    createCredential,
    updateCredential,
    removeCredential,
    revealCredential
  };
}

/**
 * Hook de gestão das concessões de acesso (ACL) de uma credencial.
 */
export function useCredentialGrants(credentialId: string | null) {
  const [grants, setGrants] = useState<CredentialGrant[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    if (!credentialId) {
      setGrants([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.inventory.credentials.grants.list(credentialId);
      setGrants(res.data);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Falha ao carregar acessos", "error");
      setGrants([]);
    } finally {
      setLoading(false);
    }
  }, [credentialId, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  // Cria uma concessão de acesso
  const addGrant = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!credentialId) return false;
      try {
        await api.inventory.credentials.grants.create(credentialId, payload);
        showToast("Acesso concedido.", "success");
        await load();
        return true;
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Falha ao conceder acesso", "error");
        return false;
      }
    },
    [credentialId, load, showToast]
  );

  // Remove uma concessão de acesso
  const removeGrant = useCallback(
    async (grantId: string) => {
      if (!credentialId) return false;
      try {
        await api.inventory.credentials.grants.remove(credentialId, grantId);
        showToast("Acesso removido.", "success");
        await load();
        return true;
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Falha ao remover acesso", "error");
        return false;
      }
    },
    [credentialId, load, showToast]
  );

  return { grants, loading, reload: load, addGrant, removeGrant };
}

/**
 * Hook de gestão das senhas padrão compartilhadas entre os equipamentos de um cliente.
 */
export function useSharedSecrets(solicitanteId: string | null) {
  const [sharedSecrets, setSharedSecrets] = useState<SharedSecret[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    if (!solicitanteId) {
      setSharedSecrets([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.inventory.sharedSecrets.list(solicitanteId);
      setSharedSecrets(res.data);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Falha ao carregar senhas padrão", "error");
      setSharedSecrets([]);
    } finally {
      setLoading(false);
    }
  }, [solicitanteId, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  // Cria uma senha padrão para o cliente
  const create = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!solicitanteId) return false;
      try {
        await api.inventory.sharedSecrets.create({ ...payload, solicitanteId });
        showToast("Senha padrão cadastrada.", "success");
        await load();
        return true;
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Falha ao cadastrar senha padrão", "error");
        return false;
      }
    },
    [solicitanteId, load, showToast]
  );

  // Atualiza a senha padrão; a troca de senha reflete em todos os equipamentos vinculados
  const update = useCallback(
    async (id: string, payload: Record<string, unknown>) => {
      try {
        await api.inventory.sharedSecrets.update(id, payload);
        showToast("Senha padrão atualizada.", "success");
        await load();
        return true;
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Falha ao atualizar senha padrão", "error");
        return false;
      }
    },
    [load, showToast]
  );

  // Remove (exclusão lógica) uma senha padrão sem uso
  const remove = useCallback(
    async (id: string) => {
      if (typeof window !== "undefined" && !window.confirm("Deseja realmente excluir esta senha padrão?")) return false;
      try {
        await api.inventory.sharedSecrets.remove(id);
        showToast("Senha padrão excluída.", "success");
        await load();
        return true;
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Falha ao excluir senha padrão", "error");
        return false;
      }
    },
    [load, showToast]
  );

  return { sharedSecrets, loading, reload: load, create, update, remove };
}

/**
 * Hook de CRUD dos grupos de usuários usados nas políticas de acesso do cofre.
 */
export function useUserGroups() {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.userGroups.list();
      setGroups(res.data);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Falha ao carregar grupos", "error");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (payload: Record<string, unknown>) => {
      try {
        await api.userGroups.create(payload);
        showToast("Grupo criado.", "success");
        await load();
        return true;
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Falha ao criar grupo", "error");
        return false;
      }
    },
    [load, showToast]
  );

  const update = useCallback(
    async (id: string, payload: Record<string, unknown>) => {
      try {
        await api.userGroups.update(id, payload);
        showToast("Grupo atualizado.", "success");
        await load();
        return true;
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Falha ao atualizar grupo", "error");
        return false;
      }
    },
    [load, showToast]
  );

  const remove = useCallback(
    async (id: string) => {
      if (typeof window !== "undefined" && !window.confirm("Deseja realmente excluir este grupo?")) return false;
      try {
        await api.userGroups.remove(id);
        showToast("Grupo excluído.", "success");
        await load();
        return true;
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Falha ao excluir grupo", "error");
        return false;
      }
    },
    [load, showToast]
  );

  return { groups, loading, reload: load, create, update, remove };
}
