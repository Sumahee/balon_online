import crypto from "node:crypto";
import { executeMutation } from "./db";
import { drawingColorCode } from "./drawing-colors";

export async function ensureDrawingHandoffs() {
  await executeMutation(`CREATE TABLE IF NOT EXISTS bo_drawing_handoffs (
    request_id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE,
    data TEXT NOT NULL, expires_at INTEGER NOT NULL
  )`);
}

export async function saveDrawingHandoff(data: { id: string; postColor?: string; boardColor?: string }) {
  const handoff = { ...data, postColor: drawingColorCode(data.postColor, "post"), boardColor: drawingColorCode(data.boardColor, "board") };
  await ensureDrawingHandoffs();
  const token = crypto.randomBytes(32).toString("hex");
  await executeMutation("INSERT INTO bo_drawing_handoffs (request_id, token_hash, data, expires_at) VALUES (?, ?, ?, ?)",
    [data.id, crypto.createHash("sha256").update(token).digest("hex"), JSON.stringify(handoff), Date.now() + 15 * 60 * 1000]);
  const url = new URL("/app", process.env.BARON_DESIGN_URL || "https://balon-design.vercel.app");
  url.hash = new URLSearchParams({ handoff: token }).toString();
  return url.toString();
}
