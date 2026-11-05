import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createClient } from "@libsql/client";
import ts from "typescript";

const nativeRequire = createRequire(import.meta.url);
function load(path, mocks = {}) {
  const loaded = { exports: {} };
  const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  new Function("require", "module", "exports", code)(name => name in mocks ? mocks[name] : nativeRequire(name), loaded, loaded.exports);
  return loaded.exports;
}

async function fixture() {
  const db = createClient({ url: "file::memory:" });
  await db.execute("CREATE TABLE bo_work_items (id TEXT PRIMARY KEY, status TEXT, progress INTEGER, delivery_date TEXT, due_date TEXT, deadline_type TEXT, notes TEXT)");
  let user = { onlineRole: "staff" };
  const handler = (connection = db) => load("src/lib/api-handlers/complete-past-installations.ts", {
    "./auth": { VERIFY: async () => user ? Response.json({ user }) : Response.json({ success: false }, { status: 401 }) },
    "@/lib/access": load("src/lib/access.ts"),
    "@/lib/db": { db: connection },
    "@/lib/date": { getToday: () => "2026-11-05" },
  }).completePastInstallations;
  const add = (id, delivery = "2026-11-04", due = "", deadline = "시공일", status = "준비완료") => db.execute({ sql: "INSERT INTO bo_work_items VALUES (?, ?, 90, ?, ?, ?, 'keep me')", args: [id, status, delivery, due, deadline] });
  return { db, handler, add, setUser(value) { user = value; } };
}

test("bulk completion covers all pages, excludes today/other deadlines and rejects invalid dates", async () => {
  const f = await fixture();
  try {
    for (let i = 0; i < 65; i++) await f.add(`past-${i}`);
    await f.add("legacy", "", "2026-11-03", null);
    await f.add("today", "2026-11-05");
    await f.add("future", "2026-11-06", "2026-11-01");
    await f.add("empty", "", "");
    await f.add("invalid", "2026-02-30");
    await f.add("invalid-month", "2026-00-05");
    await f.add("invalid-format", "2026-1-04");
    await f.add("invalid-preferred", "bad", "2026-11-01");
    for (const deadline of ["배송일", "발송일", "요청일"]) await f.add(deadline, "2026-11-01", "", deadline);
    for (const status of ["대기", "오피스", "공장", "시공완료"]) await f.add(status, "2026-11-01", "", "시공일", status);
    const response = await f.handler()(new Request("http://localhost/api/posts", { method: "PUT" }));
    assert.equal(response.status, 200);
    const { data } = await response.json();
    assert.equal(data.length, 66);
    assert.ok(data.includes("legacy"));
    const rows = (await f.db.execute("SELECT * FROM bo_work_items")).rows;
    for (const row of rows) {
      assert.equal(row.notes, "keep me");
      assert.equal(row.progress, data.includes(row.id) ? 100 : 90);
      if (data.includes(row.id)) assert.equal(row.status, "시공완료");
      else if (!["대기", "오피스", "공장", "시공완료"].includes(row.id)) assert.equal(row.status, "준비완료");
    }
    assert.equal((await (await f.handler()(new Request("http://localhost"))).json()).data.length, 0);
  } finally { f.db.close(); }
});

test("bulk completion authenticates staff and reports DB failure without partial updates", async () => {
  const f = await fixture();
  try {
    await f.add("one"); await f.add("two");
    f.setUser(null);
    assert.equal((await f.handler()(new Request("http://localhost"))).status, 401);
    f.setUser({ onlineRole: "installer" });
    assert.equal((await f.handler()(new Request("http://localhost"))).status, 403);
    f.setUser({ onlineRole: "staff" });
    assert.equal((await f.handler(null)(new Request("http://localhost"))).status, 503);
    await f.db.execute("CREATE TRIGGER fail_second BEFORE UPDATE ON bo_work_items WHEN OLD.id = 'two' BEGIN SELECT RAISE(ABORT, 'test failure'); END");
    assert.equal((await f.handler()(new Request("http://localhost"))).status, 500);
    assert.ok((await f.db.execute("SELECT status, progress FROM bo_work_items")).rows.every(row => row.status === "준비완료" && row.progress === 90));
    await f.db.execute("DROP TRIGGER fail_second");
    assert.equal((await (await f.handler()(new Request("http://localhost"))).json()).data.length, 2);
  } finally { f.db.close(); }
});

function boardFixture() {
  const React = nativeRequire("react"), state = [];
  let cursor = 0, count = 0, fail = false, release, user = { onlineRole: "staff" };
  const dates = load("src/lib/date.ts");
  const { KanbanBoard } = load("src/components/dashboard/KanbanBoard.tsx", {
    react: { ...React, useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], next => state[i] = typeof next === "function" ? next(state[i]) : next]; } },
    "next/dynamic": { default: () => () => null, __esModule: true },
    "@/components/common/DrawingQuickOpen": { DrawingQuickOpen: () => null },
    "@/lib/work-title": { getWorkTitle: item => item.title },
    "@/lib/work-status": { workStatusLabel: (_, status) => status },
    "@/lib/access": load("src/lib/access.ts"),
    "@/lib/date": { ...dates, getToday: () => "2026-11-05" },
    "@/lib/materialUtils": { getMaterialOrders: () => [], getMaterialSummary: () => ({ total: 0 }) },
    "@/lib/utils": { cn: (...args) => args.filter(Boolean).join(" ") },
    "@/context/AuthContext": { useAuth: () => ({ user }) },
    "@/context/DataContext": { useData: () => ({ isSaving: false, completePastInstallations: async () => { count++; if (fail) throw new Error("저장 실패"); await new Promise(resolve => release = resolve); return 65; } }) },
  });
  const walk = node => Array.isArray(node) ? node.flatMap(walk) : node && typeof node === "object" ? [node, ...walk(node.props?.children)] : [];
  return { render(items = []) { cursor = 0; return walk(KanbanBoard({ items, showCompleted: true })); }, setFail(value) { fail = value; }, setUser(value) { user = value; }, count: () => count, release: () => release() };
}

test("all kanban stages default collapsed except D-1 and D-DAY; manual toggles stay independent", () => {
  const f = boardFixture();
  const items = ["대기", "오피스", "공장", "준비완료", "시공완료"].flatMap(status => ["2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", ""].map(date => ({ id: status + date, clientName: status + date, title: "업무 상세", status, deliveryDate: date, dueDate: "", priority: "보통" })));
  const nodes = f.render(items);
  for (const item of items) {
    const expanded = item.status !== "시공완료" && ["2026-11-05", "2026-11-06"].includes(item.deliveryDate);
    const toggle = nodes.find(n => n.props?.["aria-label"] === `${item.clientName} 카드 ${expanded ? "접기" : "펼치기"}`);
    assert.ok(toggle, item.id);
    assert.equal(toggle.props["aria-expanded"], expanded);
  }
  nodes.find(n => n.props?.["aria-label"] === "공장2026-11-06 카드 접기").props.onClick();
  const updated = f.render(items);
  assert.ok(updated.some(n => n.props?.["aria-label"] === "공장2026-11-06 카드 펼치기"));
  assert.ok(updated.some(n => n.props?.["aria-label"] === "오피스2026-11-06 카드 접기"));
  assert.equal(f.count(), 0);
});

test("bulk button blocks repeat clicks while saving, reports success/failure and allows retry", async () => {
  const f = boardFixture();
  const button = nodes => nodes.find(n => n.type === "button" && Array.isArray(n.props.children) && n.props.children.some(text => text === "지난 시공일 일괄 완료" || text === "완료 처리 중…"));
  button(f.render()).props.onClick();
  assert.equal(button(f.render()).props.disabled, true);
  button(f.render()).props.onClick();
  assert.equal(f.count(), 1);
  f.release(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.render().find(n => n.props?.role === "status").props.children, "65건을 완료 처리했습니다.");
  f.setFail(true); button(f.render()).props.onClick(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.render().find(n => n.props?.role === "alert").props.children, "저장 실패");
  assert.equal(button(f.render()).props.disabled, false);
  f.setFail(false); button(f.render()).props.onClick(); f.release(); await new Promise(resolve => setImmediate(resolve));
  assert.ok(!f.render().some(n => n.props?.role === "alert"));
  f.setUser({ onlineRole: "installer" }); assert.equal(button(f.render()), undefined);
});

test("Korean day boundary uses Seoul midnight", () => {
  const { getToday } = load("src/lib/date.ts");
  assert.equal(getToday(new Date("2026-11-04T14:59:59Z")), "2026-11-04");
  assert.equal(getToday(new Date("2026-11-04T15:00:00Z")), "2026-11-05");
});
