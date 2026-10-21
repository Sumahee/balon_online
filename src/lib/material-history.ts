const KEY = "balon-material-history-v1";
export function readMaterialHistory(): string[] {
  try {
    const values: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(values) ? [...new Set(values.filter((value): value is string => typeof value === "string" && !!value.trim()).map(value => value.trim()))].slice(0,30) : [];
  } catch { return []; }
}
export function writeMaterialHistory(name: string, remove = false): string[] {
  const value = name.trim();
  const previous = readMaterialHistory().filter(item => item !== value);
  const next = (remove || !value ? previous : [value, ...previous]).slice(0,30);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* Restricted storage must not block work entry. */ }
  return next;
}
