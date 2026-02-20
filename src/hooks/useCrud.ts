import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/context/ToastContext";

export function useCrud<T extends { id: string | number }>(apiEndpoint: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiEndpoint);
      if (!res.ok) throw new Error("Falha ao carregar dados");
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint]);

  const create = async (item: any) => {
    setLoading(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error("Falha ao criar item");
      await fetchAll();
      showToast("Registro criado com sucesso.", "success");
      return true;
    } catch (err: any) {
      showToast(err.message, "error");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const update = async (id: string | number, item: any) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiEndpoint}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error("Falha ao atualizar item");
      await fetchAll();
      showToast("Registro atualizado com sucesso.", "success");
      return true;
    } catch (err: any) {
      showToast(err.message, "error");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string | number) => {
    if (!confirm("Tem certeza que deseja excluir este item?")) return false;
    setLoading(true);
    try {
      const res = await fetch(`${apiEndpoint}/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error("Falha ao excluir item");
      await fetchAll();
      showToast("Registro excluído com sucesso.", "success");
      return true;
    } catch (err: any) {
      showToast(err.message, "error");
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { data, loading, error, create, update, remove, refresh: fetchAll };
}
