import type { DrawerCutPart, PlacedCutPiece, SheetEstimate, SheetLayout } from "@/types";

const W = 1220, H = 2440, KERF = 4;
type Piece = { name: string; width: number; depth: number };
type Shelf = { y: number; height: number; used: number; pieces: PlacedCutPiece[] };

/** Shelf packing with guillotine strips; whole batch shares the same sheets.
 * Counts are estimates, not a guarantee of a globally minimal cutting plan.
 * Each piece reserves 4 mm on both axes for the saw path.
 */
export function calculateSheetEstimates(parts: DrawerCutPart[], hasGrain: boolean): SheetEstimate[] {
  const groups = new Map<number, DrawerCutPart[]>();
  for (const part of parts) {
    if (![part.width, part.depth, part.thickness].every(v => Number.isFinite(v) && v > 0) || !Number.isInteger(part.count) || part.count < 1)
      throw new Error("부재 치수와 수량을 확인해주세요.");
    const group = groups.get(part.thickness) ?? [];
    group.push(part); groups.set(part.thickness, group);
  }
  return [...groups].sort(([a], [b]) => a - b).map(([thickness, group]) => {
    const pieces: Piece[] = group.flatMap(p => Array.from({ length: p.count }, () => ({ name: p.name, width: p.width, depth: p.depth })));
    const orientations = (p: Piece, rotate: boolean) => {
      const a = Math.min(p.width, p.depth), b = Math.max(p.width, p.depth);
      return (rotate && a !== b ? [[a, b], [b, a]] : [[a, b]])
        .map(([width, depth]) => ({ pw: width + KERF, ph: depth + KERF, rotated: width !== p.width }))
        .filter(o => o.pw <= W && o.ph <= H);
    };
    for (const piece of pieces) if (!orientations(piece, !hasGrain).length)
      throw new Error(`${piece.name} ${piece.width} × ${piece.depth}mm는 톱날 여유를 포함해 4×8 원장에 들어가지 않습니다.`);
    function pack(rotate: boolean, byArea: boolean): SheetLayout[] {
      const ordered = [...pieces].sort((a, b) => byArea
        ? b.width * b.depth - a.width * a.depth
        : Math.max(b.width, b.depth) - Math.max(a.width, a.depth) || Math.min(b.width, b.depth) - Math.min(a.width, a.depth));
      const sheets: Shelf[][] = [];
      for (const piece of ordered) {
        const variants = orientations(piece, rotate);
        if (!variants.length) return [];
        let best: { shelf: Shelf; variant: typeof variants[number]; score: number } | undefined;
        for (const shelves of sheets) for (const shelf of shelves) for (const variant of variants) {
          if (variant.ph <= shelf.height && shelf.used + variant.pw <= W) {
            const score = (shelf.height - variant.ph) * W + W - shelf.used - variant.pw;
            if (!best || score < best.score) best = { shelf, variant, score };
          }
        }
        if (!best) {
          for (const shelves of sheets) {
            const y = shelves.reduce((sum, shelf) => sum + shelf.height, 0);
            const variant = [...variants].sort((a, b) => a.ph - b.ph).find(o => y + o.ph <= H);
            if (variant) {
              const shelf: Shelf = { y, height: variant.ph, used: 0, pieces: [] };
              shelves.push(shelf); best = { shelf, variant, score: 0 }; break;
            }
          }
        }
        if (!best) {
          const variant = [...variants].sort((a, b) => a.ph - b.ph)[0];
          const shelf: Shelf = { y: 0, height: variant.ph, used: 0, pieces: [] };
          sheets.push([shelf]); best = { shelf, variant, score: 0 };
        }
        const { shelf, variant } = best;
        shelf.pieces.push({ ...piece, x: shelf.used, y: shelf.y, ...variant });
        shelf.used += variant.pw;
      }
      return sheets.map((shelves, index) => {
        const crossCutCount = shelves.reduce((sum, shelf) => sum + Math.max(0, shelf.pieces.length - 1), 0);
        return { sheetIndex: index + 1, thickness, materialName: group[0].material, placedPieces: shelves.flatMap(s => s.pieces), stripCount: shelves.length, crossCutCount, totalSawCuts: shelves.length + crossCutCount };
      });
    }
    const candidates = [pack(false, false), pack(false, true), ...(!hasGrain ? [pack(true, false), pack(true, true)] : [])].filter(layout => layout.length);
    candidates.sort((a, b) => a.length - b.length || a.reduce((s, l) => s + l.totalSawCuts, 0) - b.reduce((s, l) => s + l.totalSawCuts, 0));
    const sheets = candidates[0];
    const totalPartsArea = group.reduce((sum, p) => sum + p.width * p.depth * p.count, 0) / 1e6;
    const totalSheetArea = sheets.length * W * H / 1e6;
    const efficiency = Number((totalPartsArea / totalSheetArea * 100).toFixed(1));
    return { thickness, materialName: group[0].material, partsCount: pieces.length,
      totalPartsArea: Number(totalPartsArea.toFixed(6)), totalSheetArea: Number(totalSheetArea.toFixed(6)),
      sheetCount: sheets.length, efficiency, lossPercentage: Number((100 - efficiency).toFixed(1)), hasGrain, sheets,
      totalSawCuts: sheets.reduce((sum, sheet) => sum + sheet.totalSawCuts, 0) };
  });
}
