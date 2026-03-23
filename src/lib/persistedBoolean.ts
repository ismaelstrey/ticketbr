export function getPersistedBoolean(key: string, defaultValue: boolean) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return defaultValue;
    if (raw === "1" || raw === "true") return true;
    if (raw === "0" || raw === "false") return false;
    return defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setPersistedBoolean(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
    return true;
  } catch {
    return false;
  }
}
