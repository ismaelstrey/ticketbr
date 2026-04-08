import { useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import { Task, TaskPriority, TaskStatus } from "@/types/task";
import { getDueState } from "@/components/tasks/task-constants";

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

export function useTaskDetail(taskId: string) {
  const [task, setTask] = useState<any>(null);
  const [assignees, setAssignees] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "PENDING" as TaskStatus,
    priority: "MEDIUM" as TaskPriority,
    dueAt: "",
    assigneeId: ""
  });

  const dueState = useMemo(() => getDueState(task?.dueAt || null, task?.status || "PENDING"), [task]);

  const load = async () => {
    setLoading(true);
    try {
      const [detailRes, assigneesRes] = await Promise.all([api.tasks.get(taskId), api.tasks.assignees()]);
      setTask(detailRes.data);
      setAssignees((assigneesRes.data || []).map((u) => ({ id: u.id, name: u.name })));
      setForm({
        title: detailRes.data.title || "",
        description: detailRes.data.description || "",
        status: detailRes.data.status,
        priority: detailRes.data.priority,
        dueAt: toDatetimeLocal(detailRes.data.dueAt || null),
        assigneeId: detailRes.data.assigneeId || ""
      });
      setError("");
    } catch (e: any) {
      setError(String(e?.message || "Falha ao carregar tarefa"));
      setTask(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!taskId) return;
    load();
  }, [taskId]);

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = {
        title: form.title,
        description: form.description || null,
        status: form.status,
        priority: form.priority,
        assigneeId: form.assigneeId || null,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null
      };
      const res = await api.tasks.update(taskId, payload);
      setTask((prev: any) => ({ ...(prev || {}), ...res.data }));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    await api.tasks.remove(taskId);
  };

  const createSubtask = async (title: string) => {
    await api.tasks.subtasks.create(taskId, { title });
    await load();
  };

  const toggleSubtask = async (subtaskId: string, isDone: boolean) => {
    await api.tasks.subtasks.update(taskId, subtaskId, { isDone });
    await load();
  };

  const removeSubtask = async (subtaskId: string) => {
    await api.tasks.subtasks.remove(taskId, subtaskId);
    await load();
  };

  const uploadAttachment = async (file: File) => {
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      await api.tasks.attachments.upload(taskId, { fileName: file.name, mimeType: file.type || null, fileSize: file.size, base64 });
      await load();
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async (attachmentId: string) => {
    await api.tasks.attachments.remove(attachmentId);
    await load();
  };

  const addTicketLink = async (ticketId: string) => {
    await api.tasks.tickets.add(taskId, { ticketId });
    await load();
  };

  const removeTicketLink = async (linkId: string) => {
    await api.tasks.tickets.remove(taskId, linkId);
    await load();
  };

  return {
    task,
    assignees,
    loading,
    saving,
    uploading,
    error,
    form,
    setForm,
    dueState,
    actions: {
      reload: load,
      save,
      remove,
      createSubtask,
      toggleSubtask,
      removeSubtask,
      uploadAttachment,
      removeAttachment,
      addTicketLink,
      removeTicketLink
    }
  };
}

