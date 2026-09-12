import { DrawerCalcInput, DrawerCalcResult, DrawerCutPart, DrawerHardware } from "@/types";

export function calculateDrawer(input: DrawerCalcInput): DrawerCalcResult {
  const {
    cabinetWidth,
    cabinetHeight,
    cabinetDepth,
    boardThickness,
    drawerCount,
    railType,
    marginGap = 3,
  } = input;

  // 1. 캐비닛 내경 계산
  const innerWidth = cabinetWidth - (2 * boardThickness);
  const innerHeight = cabinetHeight - (2 * boardThickness);
  const innerDepth = cabinetDepth - boardThickness; // 백판(우라) 제외 실내경

  // 2. 레일 규격 선정 (250, 300, 350, 400, 450, 500, 550mm 표준)
  const standardRailLengths = [250, 300, 350, 400, 450, 500, 550];
  const maxAllowableDepth = innerDepth - 25; // 후면 여유 최소 25mm
  let railLength = 400;
  for (let i = standardRailLengths.length - 1; i >= 0; i--) {
    if (standardRailLengths[i] <= maxAllowableDepth) {
      railLength = standardRailLengths[i];
      break;
    }
  }

  // 3. 서랍 박스 외경 계산
  let boxWidth = 0;
  let railName = "";
  if (railType === "undermount") {
    // 언더레일 댐핑 (블룸/삼홍 규격): 내경에서 양측 5mm씩 총 10mm 축소
    boxWidth = Math.max(100, innerWidth - 10);
    railName = `고급 언더레일 댐핑형 (${railLength}mm)`;
  } else {
    // 3단 볼레일: 좌우 유격 각 12.7mm (총 26mm)
    boxWidth = Math.max(100, innerWidth - 26);
    railName = `광폭 3단 볼레일 45mm (${railLength}mm)`;
  }

  // 서랍 1칸당 할당 높이
  const totalGaps = (drawerCount - 1) * marginGap;
  const singleFrontHeight = Math.floor((cabinetHeight - (2 * marginGap) - totalGaps) / drawerCount);
  const boxHeight = Math.max(60, Math.floor(singleFrontHeight - 35)); // 서랍 내부 박스 높이
  const boxDepth = railLength; // 서랍 박스 깊이는 레일 규격에 맞춤

  // 4. 서랍 박스 판재 두께 (보통 내부 박스는 15T 사용)
  const boxPlateT = 15;
  // 좌우 측판 사이에 앞뒤판이 들어가는 구조 (바론 표준 조립 방식)
  const innerFrontBackWidth = boxWidth - (2 * boxPlateT);
  const bottomWidth = boxWidth - (2 * 5); // 5mm 홈파기 기준 또는 평판
  const bottomDepth = boxDepth - 5;

  // 5. 부속별 절단 목록 (서랍 단수 N 배수 반영)
  const parts: DrawerCutPart[] = [
    {
      name: "서랍 전면 앞판 (도어)",
      spec: "도어 마감재",
      count: drawerCount,
      width: Math.max(50, cabinetWidth - (marginGap * 2)),
      depth: singleFrontHeight,
      thickness: boardThickness,
      material: `${boardThickness}T PET/LPM 마감`,
      notes: `외경 기준 상하좌우 ${marginGap}mm 여백 반영`,
    },
    {
      name: "서랍 좌/우 측판",
      spec: "박스 측판 (Left/Right)",
      count: drawerCount * 2,
      width: boxDepth,
      depth: boxHeight,
      thickness: boxPlateT,
      material: `${boxPlateT}T 내장재 (White PB)`,
      notes: `${railLength}mm 레일 체결용`,
    },
    {
      name: "서랍 앞/뒤 내부판",
      spec: "박스 전후목 (Front/Back)",
      count: drawerCount * 2,
      width: innerFrontBackWidth,
      depth: boxHeight,
      thickness: boxPlateT,
      material: `${boxPlateT}T 내장재 (White PB)`,
      notes: "측판 사이 조립 치수",
    },
    {
      name: "서랍 바닥판",
      spec: "바닥판 (Bottom)",
      count: drawerCount,
      width: bottomWidth,
      depth: bottomDepth,
      thickness: 9,
      material: "9T 코팅 합판",
      notes: "홈파기 슬라이딩 삽입 규격",
    },
  ];

  // 6. 하드웨어 목록
  const hardware: DrawerHardware[] = [
    {
      name: railName,
      spec: `${railLength}mm (좌/우 1세트)`,
      count: drawerCount,
      notes: railType === "undermount" ? "클립 및 댐퍼 내장형" : "스크류 조립형",
    },
    {
      name: "서랍 조립용 목공 피스",
      spec: "4 x 35mm (아연 도금)",
      count: drawerCount * 12,
      notes: "박스 골조 체결용",
    },
    {
      name: "앞판 체결 볼트/스크류",
      spec: "M4 x 25mm",
      count: drawerCount * 4,
      notes: "손잡이 겸용 또는 전면 결합",
    },
  ];

  const summaryNote = `캐비닛 외경 [${cabinetWidth} x ${cabinetHeight} x ${cabinetDepth}mm], ${boardThickness}T 기준 ${drawerCount}단 서랍. ${railName} 권장 적용.`;

  return {
    input,
    railSpec: {
      name: railName,
      length: railLength,
      type: railType,
    },
    boxDimensions: {
      width: boxWidth,
      height: boxHeight,
      depth: boxDepth,
    },
    parts,
    hardware,
    summaryNote,
  };
}
