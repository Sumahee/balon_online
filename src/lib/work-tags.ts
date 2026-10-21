export const WORK_TAGS = ["빗각", "아일랜드", "조명", "장식장", "서랍장"] as const;
export function validateWorkTags(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > WORK_TAGS.length || value.some(tag => typeof tag !== "string" || !WORK_TAGS.includes(tag as typeof WORK_TAGS[number]))) throw new Error("업무 태그를 확인해주세요.");
  return WORK_TAGS.filter(tag => value.includes(tag));
}
export function readWorkTags(value: unknown): string[] {
  try { return validateWorkTags(typeof value === "string" ? JSON.parse(value || "[]") : value ?? []); }
  catch { return []; }
}
