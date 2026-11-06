import type { DrawerCalcInput, DrawerCalcResult, DrawerHardware } from "@/types";

// Supplied 580 mm / three-drawer review sheet. Do not merge similar fasteners:
// each row has its own purchasing price and installation purpose.
export const DRAWER_COMPONENTS = [
  { id: "top-connectors", name: "상판 연결구", count: 4 },
  { id: "top-dowels", name: "목심 (나무 다보)", count: 2 },
  { id: "side-minifix", name: "옆판 미니픽스 연결 철물", count: 4 },
  { id: "side-connectors", name: "옆판 연결구", count: 2 },
  { id: "side-dowels", name: "옆판 목심 (나무 다보)", count: 2 },
  { id: "rail-screws", name: "서랍 레일 고정 나사", count: 12 },
  { id: "front-adjusters", name: "서랍 앞판 조절 철물", count: 9 },
  { id: "brace-minifix", name: "가로 보강대 미니픽스 (추정)", count: 4 },
  { id: "back-staples", name: "서랍장 뒷판 타카핀", count: 30 },
  { id: "box-screws", name: "서랍 옆판 조립 나사", count: 24 },
  { id: "screw-stickers", name: "나사 구멍 마감 스티커 (추정)", count: 12 },
  { id: "front-connectors", name: "서랍 앞판 연결 철물 (추정)", count: 9 },
  { id: "finish-stickers", name: "마감 스티커 (추정)", count: 9 },
  { id: "bottom-staples", name: "서랍 밑판 고정 타카핀 (추정)", count: 60 },
  { id: "feet", name: "서랍통 받침발", count: 4 },
  { id: "feet-staples", name: "받침발 고정 타카핀 (추정)", count: 16 },
] as const;

export const DRAWER_SHEETS = [
  { id: "sheet-18", name: "18T 몸통·앞판 원장", thickness: 18 },
  { id: "sheet-15", name: "15T 서랍재 원장", thickness: 15 },
  { id: "sheet-5", name: "5T 뒷판·밑판 원장", thickness: 5 },
] as const;
export const DRAWER_PRICE_ITEMS = [...DRAWER_COMPONENTS, ...DRAWER_SHEETS];
export type DrawerPrices = Record<string, number | null>;
export interface DrawerPriceBook { prices: DrawerPrices; revision: number; updatedAt: string | null }
export const emptyDrawerPrices = (): DrawerPrices => Object.fromEntries(DRAWER_PRICE_ITEMS.map(item => [item.id, null]));
export const isReviewedDrawer = (input: DrawerCalcInput) => input.productType === "ceiling-floor" && input.drawerCount === 3;

export function reviewedHardware(quantity: number): DrawerHardware[] {
  return DRAWER_COMPONENTS.map(item => ({ id: item.id, name: item.name, count: item.count * quantity, unit: "개",
    spec: item.id === "box-screws" ? "길이 45mm · 직경 확인 필요" : "규격 미기재",
    notes: `580 3단 1개 기준 ${item.count}개${item.id === "front-adjusters" ? " (앞판 3개 × 3개)" : ""}` }));
}

export function validateDrawerPriceBook(value: unknown): { prices: DrawerPrices; revision: number } {
  const v = value as Partial<DrawerPriceBook> | null;
  if (!v || !Number.isSafeInteger(v.revision) || v.revision! < 0 || !v.prices || typeof v.prices !== "object" || Array.isArray(v.prices))
    throw new Error("단가와 저장 버전을 확인해 주세요.");
  const keys = DRAWER_PRICE_ITEMS.map(item => item.id);
  if (Object.keys(v.prices).length !== keys.length || Object.keys(v.prices).some(key => !keys.includes(key as typeof keys[number])))
    throw new Error("표에 등록된 부품 16종과 원장 3종의 단가만 저장할 수 있습니다.");
  const prices = emptyDrawerPrices();
  for (const key of keys) {
    const price = v.prices[key];
    if (price !== null && (typeof price !== "number" || !Number.isFinite(price) || price < 0 || price > 100_000_000 || Math.abs(price * 100 - Math.round(price * 100)) > 0.000001))
      throw new Error("단가는 0~100,000,000원, 소수 둘째 자리까지 입력해 주세요. 미입력은 빈칸으로 두세요.");
    prices[key] = price;
  }
  return { prices, revision: v.revision! };
}

const money = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
export function calculateDrawerCost(result: DrawerCalcResult, prices: DrawerPrices) {
  if (!isReviewedDrawer(result.input)) return null;
  const quantity = result.input.cabinetQuantity ?? 1;
  const lines = [
    ...result.sheetEstimates.map(sheet => ({ id: `sheet-${sheet.thickness}`, name: `${sheet.thickness}T 원장`, count: sheet.sheetCount, unit: "장" })),
    ...result.hardware.map(item => ({ id: item.id!, name: item.name, count: item.count, unit: "개" })),
  ].map(line => {
    const unitPrice = prices[line.id] ?? null;
    return { ...line, unitPrice, amount: unitPrice === null ? null : money(unitPrice * line.count) };
  });
  const missing = lines.filter(line => line.unitPrice === null).map(line => line.name);
  const knownTotal = money(lines.reduce((sum, line) => sum + (line.amount ?? 0), 0));
  const materialTotal = money(lines.filter(line => line.unit === "장").reduce((sum, line) => sum + (line.amount ?? 0), 0));
  const remainingArea = result.sheetEstimates.reduce((sum, sheet) => sum + sheet.sheetCount * 1.22 * 2.44 - result.parts.filter(p => p.thickness === sheet.thickness).reduce((area, p) => area + p.width * p.depth * p.count / 1e6, 0), 0);
  return { quantity, lines, missing, knownTotal, materialTotal, hardwareTotal: money(knownTotal - materialTotal),
    total: missing.length ? null : knownTotal, perCabinet: missing.length ? null : money(knownTotal / quantity),
    hardwareCount: result.hardware.reduce((sum, item) => sum + item.count, 0), remainingArea,
    remainingAreaPerCabinet: remainingArea / quantity };
}
