export const COST_FIELDS = [["travel", "출장비"], ["parts", "부품비"], ["self", "자가수리비"], ["other", "기타 비용"]] as const;
export type Costs = Record<(typeof COST_FIELDS)[number][0], number>;
export interface MachineContact { company?: string; phone: string; technician: string; technicianPhone?: string; }
export interface Machine { id: string; name: string; description: string; model: string; location: string; status: string; revision: number; total: number; count: number; lastDate: string; contacts?: MachineContact[]; serviceCompany?: string; }
export interface Maintenance { id: string; machineId: string; date: string; title: string; kind: string; description: string; provider: string; costs: Costs; total: number; photos: string[]; author: string; revision: number; }
export const emptyCosts = (): Costs => ({travel:0,parts:0,self:0,other:0});
export function totalCosts(costs: Costs) { return COST_FIELDS.reduce((sum,[key]) => sum + costs[key],0); }
export function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value; }
export function validateCosts(input: unknown): Costs {
  const source = input as Record<string, unknown> | null;
  if (!source || typeof source !== "object") throw new Error("비용을 확인해주세요.");
  const result = emptyCosts();
  for (const [key,label] of COST_FIELDS) {
    const raw = source[key];
    if (typeof raw !== "number" || !Number.isSafeInteger(raw) || raw < 0 || raw > 1_000_000_000) throw new Error(`${label}은 0~10억 원의 정수로 입력해주세요.`);
    result[key] = raw;
  }
  return result;
}
