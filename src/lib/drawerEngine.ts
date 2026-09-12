import {
  DrawerCalcInput,
  DrawerCalcResult,
  DrawerCutPart,
  DrawerHardware,
  SheetEstimate,
  SheetLayout,
} from "@/types";

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

  // 7. 4×8 원장 (1220 × 2440mm) 소요 장수 및 수율/로스율 계산
  const hasGrain = input.hasGrain ?? false;
  const sheetEstimates = calculateSheetEstimates(parts, hasGrain);
  const totalSheetsAllMaterials = sheetEstimates.reduce((acc, curr) => acc + curr.sheetCount, 0);

  const summaryNote = `캐비닛 외경 [${cabinetWidth} x ${cabinetHeight} x ${cabinetDepth}mm], ${boardThickness}T 기준 ${drawerCount}단 서랍. ${railName} 권장 적용. 4×8 원장 총 ${totalSheetsAllMaterials}장 필요 (${hasGrain ? "결 있음: 방향 고정" : "결 없음: 90° 회전 자유"}).`;

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
    sheetEstimates,
    totalSheetsAllMaterials,
    summaryNote,
  };
}

/**
 * 4×8 원장 (1220mm × 2440mm = 2.977m²) 소요 장수 & 수율 / 로스율 & 2D 부재 배치 알고리즘
 */
function calculateSheetEstimates(parts: DrawerCutPart[], hasGrain: boolean): SheetEstimate[] {
  const SHEET_W = 1220;
  const SHEET_H = 2440;
  const ONE_SHEET_AREA_M2 = (SHEET_W * SHEET_H) / 1000000;
  const KERF = 4; // 톱날 유격 4mm

  // Group parts by thickness
  const groups: { [key: number]: { parts: DrawerCutPart[]; materialName: string } } = {};

  parts.forEach((p) => {
    const t = p.thickness;
    if (!groups[t]) {
      groups[t] = { parts: [], materialName: p.material };
    }
    groups[t].parts.push(p);
  });

  const estimates: SheetEstimate[] = Object.keys(groups).map((tStr) => {
    const thickness = Number(tStr);
    const group = groups[thickness];

    // Flatten all individual cut pieces
    interface RawPiece {
      name: string;
      origW: number;
      origH: number;
      w: number;
      h: number;
      initialRotated: boolean;
    }

    const rawPieces: RawPiece[] = [];
    let totalPartsAreaMm2 = 0;

    group.parts.forEach((p) => {
      for (let i = 0; i < p.count; i++) {
        // ★ 목공 표준 결 방향 정렬 기준:
        // 4×8 원장의 결(Grain)은 2,440mm 세로(긴축) 방향으로 형성되어 있습니다.
        // 부재의 결 또한 긴 변(Math.max(W, H))을 따라 형성되므로,
        // 기본적으로 부재의 긴 변이 원장의 세로(2,440mm) 방향과 일치하도록 (shorter=가로, longer=세로) 기본 정렬합니다.
        const longer = Math.max(p.width, p.depth);
        const shorter = Math.min(p.width, p.depth);

        const origW = shorter; // 가로 축 (1,220mm 방향 - 결 수직)
        const origH = longer;  // 세로 축 (2,440mm 방향 - 결 수평 결합)
        const rotated = p.width > p.depth;

        rawPieces.push({
          name: p.name,
          origW,
          origH,
          w: origW + KERF,
          h: origH + KERF,
          initialRotated: rotated,
        });
        totalPartsAreaMm2 += p.width * p.depth;
      }
    });

    const totalPartsAreaM2 = Number((totalPartsAreaMm2 / 1000000).toFixed(2));

    // Sort pieces to MINIMIZE SAW CUTS:
    // 1. Group by matching Height (h) descending to form uniform horizontal strips
    // 2. Secondary sort by Width (w) descending
    rawPieces.sort((a, b) => {
      const hDiff = b.h - a.h;
      if (Math.abs(hDiff) > 1) return hDiff;
      return b.w - a.w;
    });

    // Helper simulation function to run packing under a given rotation mode
    const runSimulation = (allowRotation: boolean): SheetLayout[] => {
      const layouts: SheetLayout[] = [];
      let currentSheet: SheetLayout = {
        sheetIndex: 1,
        thickness,
        materialName: group.materialName,
        placedPieces: [],
        stripCount: 0,
        crossCutCount: 0,
        totalSawCuts: 0,
      };

      let currentShelfY = 0;
      let currentShelfX = 0;
      let currentShelfH = 0;

      let sheetRows: { height: number; pieceCount: number }[] = [];
      let currentSheetPiecesInRow = 0;

      rawPieces.forEach((piece) => {
        let pw = piece.w;
        let ph = piece.h;
        let rotated = piece.initialRotated;

        // If rotation is allowed (hasGrain = false)
        if (allowRotation) {
          // Check if rotating 90 deg makes height match current shelf or improves horizontal fit
          const fitsNormal = currentShelfX + pw <= SHEET_W && currentShelfY + ph <= SHEET_H;
          const fitsRotated = currentShelfX + ph <= SHEET_W && currentShelfY + pw <= SHEET_H;

          if (!fitsNormal && fitsRotated) {
            [pw, ph] = [ph, pw];
            rotated = !rotated;
          } else if (fitsNormal && fitsRotated && currentShelfH > 0) {
            // Match shelf height if possible
            if (Math.abs(pw - currentShelfH) < Math.abs(ph - currentShelfH)) {
              [pw, ph] = [ph, pw];
              rotated = !rotated;
            }
          }
        }

        // 1. Fits in current shelf row
        if (currentShelfX + pw <= SHEET_W && currentShelfY + ph <= SHEET_H) {
          currentSheet.placedPieces.push({
            name: piece.name,
            width: piece.origW,
            depth: piece.origH,
            x: currentShelfX,
            y: currentShelfY,
            pw,
            ph,
            rotated,
          });
          currentShelfX += pw;
          currentSheetPiecesInRow++;
          if (ph > currentShelfH) currentShelfH = ph;
        }
        // 2. Fits on new shelf row in current sheet
        else if (currentShelfY + currentShelfH + ph <= SHEET_H && pw <= SHEET_W) {
          if (currentSheetPiecesInRow > 0) {
            sheetRows.push({ height: currentShelfH, pieceCount: currentSheetPiecesInRow });
          }
          currentShelfY += currentShelfH;
          currentShelfX = 0;
          currentShelfH = ph;
          currentSheetPiecesInRow = 0;

          currentSheet.placedPieces.push({
            name: piece.name,
            width: piece.origW,
            depth: piece.origH,
            x: currentShelfX,
            y: currentShelfY,
            pw,
            ph,
            rotated,
          });
          currentShelfX += pw;
          currentSheetPiecesInRow++;
        }
        // 3. Requires new 4x8 sheet
        else {
          if (currentSheetPiecesInRow > 0) {
            sheetRows.push({ height: currentShelfH, pieceCount: currentSheetPiecesInRow });
          }
          currentSheet.stripCount = sheetRows.length;
          currentSheet.crossCutCount = sheetRows.reduce((sum, r) => sum + Math.max(0, r.pieceCount - 1), 0);
          currentSheet.totalSawCuts = currentSheet.stripCount + currentSheet.crossCutCount;
          layouts.push(currentSheet);

          sheetRows = [];
          currentSheet = {
            sheetIndex: layouts.length + 1,
            thickness,
            materialName: group.materialName,
            placedPieces: [],
            stripCount: 0,
            crossCutCount: 0,
            totalSawCuts: 0,
          };
          currentShelfY = 0;
          currentShelfX = 0;
          currentShelfH = ph;
          currentSheetPiecesInRow = 0;

          currentSheet.placedPieces.push({
            name: piece.name,
            width: piece.origW,
            depth: piece.origH,
            x: currentShelfX,
            y: currentShelfY,
            pw,
            ph,
            rotated,
          });
          currentShelfX += pw;
          currentSheetPiecesInRow++;
        }
      });

      if (currentSheet.placedPieces.length > 0) {
        if (currentSheetPiecesInRow > 0) {
          sheetRows.push({ height: currentShelfH, pieceCount: currentSheetPiecesInRow });
        }
        currentSheet.stripCount = sheetRows.length;
        currentSheet.crossCutCount = sheetRows.reduce((sum, r) => sum + Math.max(0, r.pieceCount - 1), 0);
        currentSheet.totalSawCuts = currentSheet.stripCount + currentSheet.crossCutCount;
        layouts.push(currentSheet);
      }

      return layouts;
    };

    // Run simulation for fixed grain (hasGrain = true)
    const fixedGrainLayouts = runSimulation(false);

    // If hasGrain = false, compare fixed grain vs rotation allowed to pick optimal (minimizes sheetCount & sawCuts)
    let sheetLayouts = fixedGrainLayouts;

    if (!hasGrain) {
      const freeRotationLayouts = runSimulation(true);
      if (
        freeRotationLayouts.length < fixedGrainLayouts.length ||
        (freeRotationLayouts.length === fixedGrainLayouts.length &&
          freeRotationLayouts.reduce((s, x) => s + x.totalSawCuts, 0) <=
            fixedGrainLayouts.reduce((s, x) => s + x.totalSawCuts, 0))
      ) {
        sheetLayouts = freeRotationLayouts;
      }
    }

    const sheetsNeeded = sheetLayouts.length;
    const totalSheetArea = Number((sheetsNeeded * ONE_SHEET_AREA_M2).toFixed(2));
    const rawEfficiency = totalSheetArea > 0 ? (totalPartsAreaM2 / totalSheetArea) * 100 : 0;
    const efficiency = Number(Math.min(98, Math.max(10, rawEfficiency)).toFixed(1));
    const lossPercentage = Number((100 - efficiency).toFixed(1));
    const totalSawCutsForThickness = sheetLayouts.reduce((sum, s) => sum + s.totalSawCuts, 0);

    return {
      thickness,
      materialName: group.materialName,
      partsCount: rawPieces.length,
      totalPartsArea: totalPartsAreaM2,
      sheetCount: sheetsNeeded,
      totalSheetArea,
      efficiency,
      lossPercentage,
      hasGrain,
      sheets: sheetLayouts,
      totalSawCuts: totalSawCutsForThickness,
    };
  });

  return estimates;
}

