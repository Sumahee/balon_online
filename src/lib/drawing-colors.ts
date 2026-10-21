// Source: baron_web/src/components/Ceiling/InputPanel.tsx and store.ts (2026-10-13).
// Baron's catalog is defined in source, not a database/API. Keep labels/codes together.
export const POST_COLORS = [
  ["NONE", "미정"], ["WHITE", "화이트"], ["SILVER", "실버"], ["BLACK", "블랙"],
  ["DARK_GRAY", "다크그레이"], ["ROSE_GOLD", "로즈골드"], ["GOLD", "골드"],
] as const;
export const BOARD_COLORS = [
  ["NONE", "미정"], ["WHITE", "H01 FJ13 화이트"], ["MAPLE", "H02 BA2 메이플"],
  ["DARK_BROWN", "H03 UA11 다크브라운"], ["WHITE_TILE", "H04 FG3 화이트타일"],
  ["DARK_GRAY", "H05 AC1 다크그레이"], ["GRAY_TILE", "H06 FL1 그레이타일"],
] as const;
export function drawingColorCode(value: string | undefined, kind: "post" | "board") {
  const text = value?.trim() || "미정";
  const catalog = kind === "post" ? POST_COLORS : BOARD_COLORS;
  return catalog.find(([code,label]) => code === text || label === (kind === "post" ? text.replace(/^\d+\s*/, "") : text))?.[0] || text;
}
