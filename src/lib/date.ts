/** 업무 날짜는 한국 시간의 YYYY-MM-DD로 비교합니다. */
export function getToday(date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(date);
}

export function getDaysUntil(date: string, today = getToday()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const days = (Date.parse(date) - Date.parse(today)) / 86_400_000;
  return Number.isFinite(days) ? days : null;
}
