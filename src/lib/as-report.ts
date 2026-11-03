import type { AsItem } from "@/types";
import { getToday } from "./date";

export function isReportDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function shiftReportDate(value: string, days: number): string {
  return new Date(Date.parse(value) + days * 86_400_000).toISOString().slice(0, 10);
}

function monday(value: string): string {
  return shiftReportDate(value, -(new Date(value).getUTCDay() + 6) % 7);
}

export function defaultAsReportRange(today = getToday()) {
  const start = monday(today);
  return { start, end: shiftReportDate(start, 5) };
}

export function asReportRangeError(start: string, end: string): string {
  if (!isReportDate(start) || !isReportDate(end)) return "시작일과 종료일을 올바르게 입력해 주세요.";
  if (start > end) return "종료일은 시작일보다 빠를 수 없습니다.";
  if ((Date.parse(end) - Date.parse(start)) / 86_400_000 >= 366) return "한 번에 최대 366일의 보고서를 조회할 수 있습니다.";
  return "";
}

export function asReceivedDate(item: Pick<AsItem, "receivedDate" | "createdAt">): string {
  if (isReportDate(item.receivedDate || "")) return item.receivedDate!;
  // Only legacy records without a receipt date fall back to their creation date.
  if (item.receivedDate) return "";
  if (isReportDate(item.createdAt)) return item.createdAt;
  const value = item.createdAt?.replace(" ", "T");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value || "")) return "";
  const parsed = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`);
  return Number.isFinite(parsed.getTime()) ? getToday(parsed) : "";
}

export function asReportSummary(items: AsItem[]) {
  return {
    total: items.length,
    received: items.filter(item => item.resultStatus === "접수").length,
    processing: items.filter(item => item.resultStatus === "처리중").length,
    completed: items.filter(item => item.resultStatus === "완료").length,
    urgent: items.filter(item => item.priority === "긴급").length,
  };
}

export interface AsReportWeek {
  start: string;
  end: string;
  from: string;
  to: string;
  items: AsItem[];
}

export function buildAsReport(items: AsItem[], start: string, end: string) {
  const error = asReportRangeError(start, end);
  if (error) throw new Error(error);
  const weeks: AsReportWeek[] = [];
  const byMonday = new Map<string, AsReportWeek>();
  for (let day = monday(start); day <= end; day = shiftReportDate(day, 7)) {
    const saturday = shiftReportDate(day, 5);
    if (saturday < start) continue;
    const week = { start: day, end: saturday, from: day < start ? start : day, to: saturday > end ? end : saturday, items: [] as AsItem[] };
    weeks.push(week);
    byMonday.set(day, week);
  }
  let excludedSundays = 0, undated = 0;
  for (const item of items) {
    const date = asReceivedDate(item);
    if (!date) { undated++; continue; }
    if (date < start || date > end) continue;
    if (new Date(date).getUTCDay() === 0) { excludedSundays++; continue; }
    byMonday.get(monday(date))?.items.push(item);
  }
  for (const week of weeks) week.items.sort((a, b) => asReceivedDate(a).localeCompare(asReceivedDate(b)) || a.clientName.localeCompare(b.clientName, "ko") || a.id.localeCompare(b.id));
  const summary = asReportSummary(weeks.flatMap(week => week.items));
  return { start, end, weeks, summary, excludedSundays, undated };
}

export type AsReport = ReturnType<typeof buildAsReport>;
