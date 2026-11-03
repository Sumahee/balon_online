import { getToday } from "./date";

export const CARBIDE_KINDS = ["연마", "구입", "수리", "폐기", "기타"] as const;
export const CARBIDE_STATUSES = ["의뢰/발주", "진행중", "완료", "취소"] as const;
export const CARBIDE_TYPES = ["원형 톱날", "스코어링 톱날", "루터비트/엔드밀", "커터/몰더", "대패날", "드릴비트", "기타"] as const;
export const CARBIDE_MATERIALS = ["초경(HW/HM)", "다이아몬드(PCD)", "고속도강(HSS)", "기타"] as const;
export const CARBIDE_OPTIONS = ["팁수리", "팁교체", "세척", "평탄/장력 교정", "코팅", "형상 수정", "기타 작업"] as const;
export const CARBIDE_PAYMENTS = ["미정", "미지급", "지급완료"] as const;
export const CARBIDE_MONEY_FIELDS = ["unitPrice", "tipUnitPrice", "shippingCost", "otherCost", "vat"] as const;
export const CARBIDE_SPEC_FIELDS = ["diameter", "kerf", "bore", "teeth"] as const;
export interface CarbideValues {
  date: string; kind: typeof CARBIDE_KINDS[number]; status: typeof CARBIDE_STATUSES[number];
  toolName: string; toolCode: string; toolType: typeof CARBIDE_TYPES[number]; material: typeof CARBIDE_MATERIALS[number];
  brandModel: string; spec: string; machine: string;
  diameter: number | null; kerf: number | null; bore: number | null; teeth: number | null;
  quantity: number; provider: string; contact: string; phone: string; expectedDate: string; receivedDate: string;
  options: typeof CARBIDE_OPTIONS[number][]; tipCount: number;
  unitPrice: number; tipUnitPrice: number; shippingCost: number; otherCost: number; vat: number;
  payment: typeof CARBIDE_PAYMENTS[number]; documentNo: string; memo: string;
}
export interface CarbideRecord extends CarbideValues {
  id: string; total: number; revision: number; author: string; createdBy: string; updatedBy: string; createdAt: string; updatedAt: string;
}
export interface CarbideList {
  items: CarbideRecord[]; count: number;
  summary: { amount: number; completedAmount: number; openCount: number; tipCount: number };
}
export function validCarbideDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function emptyCarbideValues(): CarbideValues {
  return { date: getToday(), kind: "연마", status: "의뢰/발주", toolName: "", toolCode: "", toolType: "원형 톱날", material: "초경(HW/HM)", brandModel: "", spec: "", machine: "", diameter: null, kerf: null, bore: null, teeth: null, quantity: 1, provider: "", contact: "", phone: "", expectedDate: "", receivedDate: "", options: [], tipCount: 0, unitPrice: 0, tipUnitPrice: 0, shippingCost: 0, otherCost: 0, vat: 0, payment: "미정", documentNo: "", memo: "" };
}
export function carbideCosts(value: Pick<CarbideValues, "quantity" | "unitPrice" | "tipCount" | "tipUnitPrice" | "shippingCost" | "otherCost" | "vat">) {
  const base = value.quantity * value.unitPrice, tips = value.tipCount * value.tipUnitPrice;
  const total = base + tips + value.shippingCost + value.otherCost + value.vat;
  if (!Number.isSafeInteger(total) || total < 0 || total > 1_000_000_000_000) throw new Error("합계 금액은 1조 원 이하의 정수로 입력해 주세요.");
  return { base, tips, total };
}
export function validateCarbideValues(input: unknown): CarbideValues {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("기록 내용을 확인해 주세요.");
  const raw = input as Record<string, unknown>;
  function text(key: string, label: string, max: number, required = false) {
    if (raw[key] !== undefined && typeof raw[key] !== "string") throw new Error(`${label} 입력 형식을 확인해 주세요.`);
    const value = String(raw[key] ?? "").trim();
    if ((required && !value) || value.length > max) throw new Error(`${label}을(를) ${required ? "필수로 " : ""}${max}자 이내로 입력해 주세요.`);
    return value;
  }
  function choice<T extends string>(key: string, choices: readonly T[]): T {
    const label = { kind: "작업 구분", status: "진행 상태", toolType: "날물 종류", material: "날물 재질", payment: "지급 상태" }[key] || "항목";
    if (!choices.includes(raw[key] as T)) throw new Error(`${label} 선택값을 확인해 주세요.`);
    return raw[key] as T;
  }
  function number(key: string, label: string, max: number, integer = true, nullable = false): number | null {
    const original = raw[key];
    if (original === undefined || original === null || original === "") return nullable ? null : 0;
    if ((typeof original !== "number" && typeof original !== "string") || !/^\d+(?:\.\d+)?$/.test(String(original))) throw new Error(`${label}은(는) 0 이상의 숫자로 입력해 주세요.`);
    const value = Number(original);
    if (!Number.isFinite(value) || value < 0 || value > max || (integer && !Number.isSafeInteger(value))) throw new Error(`${label} 범위 또는 소수점 입력을 확인해 주세요.`);
    return value;
  }
  const date = text("date", "기록일", 10, true), expectedDate = text("expectedDate", "입고 예정일", 10), receivedDate = text("receivedDate", "완료·입고일", 10);
  if (!validCarbideDate(date) || (expectedDate && (!validCarbideDate(expectedDate) || expectedDate < date)) || (receivedDate && (!validCarbideDate(receivedDate) || receivedDate < date))) throw new Error("날짜를 확인해 주세요. 예정일·완료일은 기록일 이후여야 합니다.");
  const kind = choice("kind", CARBIDE_KINDS), status = choice("status", CARBIDE_STATUSES);
  if (status === "완료" && !receivedDate) throw new Error("완료된 기록에는 완료·입고일을 입력해 주세요.");
  const options = raw.options;
  if (!Array.isArray(options) || options.length > CARBIDE_OPTIONS.length || new Set(options).size !== options.length || options.some(option => !CARBIDE_OPTIONS.includes(option))) throw new Error("작업 옵션을 확인해 주세요.");
  const quantity = number("quantity", "수량", 10_000)!;
  if (quantity < 1) throw new Error("수량은 1개 이상이어야 합니다.");
  const tipCount = number("tipCount", "팁 작업 개수", 100_000)!, tipUnitPrice = number("tipUnitPrice", "팁 개당 금액", 1_000_000_000)!;
  if ((tipCount || tipUnitPrice) && !options.some(option => option === "팁수리" || option === "팁교체")) throw new Error("팁 작업 개수·금액을 입력하려면 팁수리 또는 팁교체를 선택해 주세요.");
  if (tipUnitPrice && !tipCount) throw new Error("팁 작업 개수를 입력해 주세요.");
  const result: CarbideValues = {
    date, kind, status, toolName: text("toolName", "날물명", 100, true), toolCode: text("toolCode", "관리번호", 80),
    toolType: choice("toolType", CARBIDE_TYPES), material: choice("material", CARBIDE_MATERIALS), brandModel: text("brandModel", "제조사·모델", 150), spec: text("spec", "추가 규격", 300), machine: text("machine", "사용 설비·위치", 150),
    diameter: number("diameter", "외경", 100_000, false, true), kerf: number("kerf", "절단폭", 100_000, false, true), bore: number("bore", "내경·샹크경", 100_000, false, true), teeth: number("teeth", "날수", 100_000, true, true),
    quantity, provider: text("provider", "거래 업체", 150), contact: text("contact", "업체 담당자", 80), phone: text("phone", "업체 연락처", 80), expectedDate, receivedDate, options, tipCount, tipUnitPrice,
    unitPrice: number("unitPrice", "기본 단가", 1_000_000_000)!, shippingCost: number("shippingCost", "배송비", 1_000_000_000)!, otherCost: number("otherCost", "기타 작업비", 1_000_000_000)!, vat: number("vat", "부가세", 1_000_000_000)!,
    payment: choice("payment", CARBIDE_PAYMENTS), documentNo: text("documentNo", "명세서·전표번호", 100), memo: text("memo", "작업 내용·메모", 6000),
  };
  for (const key of CARBIDE_SPEC_FIELDS) if (result[key] === 0) throw new Error("규격은 0보다 큰 값으로 입력하거나 비워 주세요.");
  carbideCosts(result);
  return result;
}
