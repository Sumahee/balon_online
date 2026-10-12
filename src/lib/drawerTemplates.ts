import type { DrawerCalcInput, DrawerCutPart } from "@/types";

// Source: supplied backup2 workbook, sheets 1–4, B8:E22.
export const DRAWER_TEMPLATES = [
  { id: "ceiling-floor", label: "천정형 손잡이 바닥형", counts: [2, 3, 4], width: 580 },
  { id: "ceiling-floating", label: "천정형 손잡이 공중형", counts: [1, 2], width: 680 },
  { id: "island-channel", label: "아일랜드 목찬넬형", counts: [4], width: 800 },
  { id: "island-handle", label: "아일랜드 손잡이형", counts: [4], width: 800 },
] as const;

export function templateDimensions(type: DrawerCalcInput["productType"], count: number) {
  if (type === "ceiling-floor") return { height: ({ 2: 418, 3: 602, 4: 786 }[count] ?? 418) + 26, depth: 400 };
  if (type === "ceiling-floating") return { height: count === 1 ? 210 : 405, depth: 400 };
  return { height: 908, depth: 513 };
}

export function buildTemplate(input: DrawerCalcInput) {
  const template = DRAWER_TEMPLATES.find(t => t.id === input.productType);
  if (!template) throw new Error("지원하지 않는 제작 유형입니다.");
  const n = input.drawerCount, w = input.cabinetWidth, q = input.cabinetQuantity ?? 1;
  if (!(template.counts as readonly number[]).includes(n)) throw new Error("선택한 제품의 지원 단수를 확인해주세요.");
  if (!Number.isFinite(w) || w < 200 || w > 1200) throw new Error("비규격 가로는 200~1200mm로 입력해주세요.");
  if (!Number.isInteger(q) || q < 1 || q > 100) throw new Error("세대 수는 1~100의 정수로 입력해주세요.");
  const parts: DrawerCutPart[] = [];
  const add = (name: string, width: number, depth: number, thickness: number, count: number, edge = "", note = "") => {
    parts.push({ name, width, depth, thickness, count: count * q, edge: edge || (name.includes("처짐") ? "불필요함" : ""), machining: note, material: thickness === 4.5 ? "4.5T 우라" : `${thickness}T 화이트 판재`, spec: edge || "엣지 없음", notes: [edge, note].filter(Boolean).join(" / ") });
  };
  const warnings: string[] = [];
  const island = template.id.startsWith("island");
  const channel = template.id === "island-channel";
  const floating = template.id === "ceiling-floating";
  const railLength = island ? 450 : 350;
  if (!island) {
    add("도어", w - (floating ? 36 : 4), floating ? 190 : 180, 18, n, "사면", "사면엣지");
    add("천판", w, 400, 18, 1, "사면", "400mm/우라홈파기");
    add(floating ? "지판" : "지판/걸레받이", w - (floating ? 76 : 36), floating ? 380 : 55, 18, floating ? 1 : 2, "양면/55mm", floating ? "우라홈파기" : "타카 & 우라피스");
    add("측판", floating ? n * 190 : ({ 2: 418, 3: 602, 4: 786 }[n]!), 380, 18, 2, "사면", "400mm/우라홈파기");
    add("서랍내부 전.뒤판", w - (floating ? 133 : 93), 144, 15, n * 2, "양면/149mm", "150mm/우라홈파기");
    add("서랍내부 좌우측판", 350, 145, 15, n * 2, "양면/150mm", "150mm/우라홈파기");
    add("우라 처짐방지대", 320, 50, 15, n, "불필요함", "엣지작업 불필요함");
    add("서랍내부 밑판우라", w - (floating ? 120 : 80), 332, 4.5, n);
    add("뒤판우라", w - (floating ? 64 : 24), floating ? n * 190 - 6 : ({ 2: 396, 3: 582, 4: 766 }[n]!), 4.5, 1);
    warnings.push(floating
      ? "공중형 밑판우라 수량은 원본의 고정 2개 대신 단수 × 세대 수를 적용했습니다."
      : "원본 외경 높이 수식이 측판 깊이를 참조합니다. 표시 높이는 측판 높이 + 26mm로 산출했으므로 가구발 높이를 확인해주세요.");
  } else {
    const doorWidth = w - (channel ? 4 : 5);
    add("도어(상단)", doorWidth, channel ? 122 : 145, 18, 1, "사면", "보석함 마이다");
    add("도어(2,3,4번)", doorWidth, channel ? 193 : 205, 18, 3, "사면");
    add("상단멍/걸레받이", doorWidth, 60, 18, 2, "사면");
    add("지판", w - 36, channel ? 476 : 471, 18, 1, "사면");
    add("측판", channel ? 495 : 902, channel ? 900 : 490, 18, 2, "사면");
    add("뒤판", w - 36, 900, 18, 1, "사면");
    add("유리판 지지대/가로", w - 36, channel ? 60 : 50, 18, 2, "양면");
    add("유리판 지지대/세로", channel ? 437 : 434, channel ? 60 : 50, 18, 2, "양면");
    if (channel) add("목찬넬", w - 36, 60, 18, 3, "양면");
    add("서랍내부 전.뒤판(상단)", w - (channel ? 92 : 93), channel ? 79 : 84, 15, 2, "양면", "우라홈파기");
    add("서랍내부 좌우측판(상단)", 450, channel ? 80 : 85, 15, 2, "양면", "우라홈파기");
    add("서랍내부 전.뒤판(2,3,4번)", w - (channel ? 92 : 93), channel ? 129 : 144, 15, 6, "양면", "우라홈파기");
    add("서랍내부 좌우측판(2,3,4번)", 450, channel ? 144 : 145, 15, 6, "양면");
    add("우라 처짐방지대", 420, 50, 15, 4);
    add("서랍내부 밑판/우라", w - 80, channel ? 432 : 433, 4.5, 4);
    warnings.push(channel
      ? "목찬넬형 원본은 서랍 측판 깊이 450mm와 레일 표기 350mm가 상충합니다. 450mm를 적용했으므로 발주 전 레일을 확인해주세요."
      : "손잡이형 원본의 하단 주석은 350mm이나 부속 행은 450mm입니다. 부속 행 기준 450mm를 적용했습니다.");
    warnings.push("일부 엣지·홈파기 주석의 높이가 재단 치수와 다릅니다. 재단표 치수를 기준으로 표시하며 가공 위치는 확인해주세요.");
  }
  return { parts, warnings, railLength, label: template.label, dimensions: templateDimensions(input.productType, n), boxDimensions: { width: w - (floating ? 133 : channel ? 92 : 93) + 30, height: island ? (channel ? 80 : 85) : 145, depth: railLength } };
}
