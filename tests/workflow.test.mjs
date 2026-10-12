import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { Script } from "node:vm";
import { test } from "node:test";
import ts from "typescript";

const nativeRequire = createRequire(import.meta.url);

// Isolated module graphs keep tests away from real Turso credentials and records.
function loadModule(file, mocks = {}, globals = {}, cache = new Map()) {
  const requestedPath = resolve(file);
  const path = [requestedPath, requestedPath.replace(/\.ts$/, ".tsx"), requestedPath.replace(/\.ts$/, "/index.ts")].find(existsSync) ?? requestedPath;
  if (cache.has(path)) return cache.get(path).exports;
  const loaded = { exports: {} };
  cache.set(path, loaded);
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const require = (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith("@/")) return loadModule(`src/${name.slice(2)}.ts`, mocks, globals, cache);
    if (name.startsWith("./")) return loadModule(resolve(path, "..", `${name}.ts`), mocks, globals, cache);
    return nativeRequire(name);
  };
  new Script(`(function(require, module, exports) { ${code}\n})`, { filename: path })
    .runInNewContext({ ...globalThis, console, Buffer, URL, Intl, AbortSignal, process: { env: { NODE_ENV: "production" } }, crypto: globalThis.crypto, ...globals })(require, loaded, loaded.exports);
  return loaded.exports;
}

const request = (body) => ({ json: async () => body });

test("AS intake persists installation, received and scheduled dates with paid reason", async () => {
  const writes = [];
  const handlers = loadModule("src/lib/api-handlers/posts.ts", {
    "@/lib/db": { db: {}, executeQuery: async () => ({ success: true, rows: [{ id: "as-test", client_name: "고객", construct_date: "2026-01-01", installer: "시공자", received_date: "2026-10-12", as_date: "2026-10-15", technician: "처리기사", service_type: "유상", paid_reason: "기간만료" }] }), executeMutation: async (sql,args) => { writes.push({sql,args}); } },
    "@/lib/as-schema": { ensureAsSchema: async () => {} },
  });
  const response = await handlers.POST(request({ type: "as", clientName: "고객", siteAddress: "현장", reason: "서랍 수리", constructDate: "2026-01-01", installer: "시공자", receivedDate: "2026-10-12", asDate: "2026-10-15", technician: "처리기사", serviceType: "유상", paidReason: "기간만료" }));
  assert.equal(response.status, 201);
  assert.deepEqual(Array.from(writes[0].args.slice(12)), ["시공자", "2026-10-12", "2026-10-15", "유상", "기간만료"]);
  const listed = await (await handlers.GET({url:"http://localhost/api/posts?type=as"})).json();
  assert.equal(listed.data[0].installer, "시공자");
  assert.equal(listed.data[0].asDate, "2026-10-15");
  assert.equal(listed.data[0].paidReason, "기간만료");
  const invalid = await handlers.POST(request({type:"as",clientName:"고객",siteAddress:"현장",reason:"수리",serviceType:"유상"}));
  assert.equal(invalid.status,400);
  await handlers.PUT(request({id:"as-test",type:"as",serviceType:"무상",paidReason:"고객과실"}));
  assert.equal(writes.at(-1).args[1], "");
});

test("Excel floor drawer reproduces parts and scales every quantity", () => {
  const { calculateDrawer } = loadModule("src/lib/drawerEngine.ts");
  const input = { productType: "ceiling-floor", cabinetWidth: 580, cabinetHeight: 850, cabinetDepth: 600, boardThickness: 18, drawerCount: 2, railType: "ball3stage", marginGap: 3, cabinetQuantity: 1 };
  const result = calculateDrawer(input);
  const expected = [[576,180,18,2],[580,400,18,1],[544,55,18,2],[418,380,18,2],[487,144,15,4],[350,145,15,4],[320,50,15,2],[500,332,4.5,2],[556,396,4.5,1]];
  result.parts.forEach((p, i) => assert.deepEqual([p.width,p.depth,p.thickness,p.count], expected[i]));
  assert.equal(result.input.cabinetHeight, 444);
  const batch = calculateDrawer({ ...input, cabinetQuantity: 3, cabinetWidth: 681 });
  batch.parts.forEach((p,i) => assert.equal(p.count, result.parts[i].count * 3));
  assert.equal(batch.parts[4].width, 588);
  assert.equal(batch.hardware[0].count, 6);
});

test("Excel floating and island templates preserve distinct heights and rail warnings", () => {
  const { calculateDrawer } = loadModule("src/lib/drawerEngine.ts");
  const base = { cabinetWidth: 800, cabinetHeight: 908, cabinetDepth: 513, boardThickness: 18, drawerCount: 4, railType: "ball3stage", marginGap: 3 };
  const handle = calculateDrawer({ ...base, productType: "island-handle" });
  assert.equal(handle.parts[0].width, 795);
  assert.equal(handle.parts[0].depth, 145);
  assert.equal(handle.parts[1].depth, 205);
  assert.equal(handle.parts.at(-1).depth, 433);
  assert.equal(handle.railSpec.length, 450);
  const channel = calculateDrawer({ ...base, productType: "island-channel" });
  assert.equal(channel.parts[0].depth, 122);
  assert.equal(channel.parts.find(p => p.name === "목찬넬").count, 3);
  assert.ok(channel.warnings.length);
  const floating = calculateDrawer({ ...base, productType: "ceiling-floating", cabinetWidth: 680, drawerCount: 1, cabinetQuantity: 2 });
  assert.equal(floating.parts[7].count, 2);
  assert.equal(floating.parts[4].width, 547);
  assert.equal(floating.parts[8].depth, 184);
  assert.equal(floating.input.cabinetHeight, 210);
  assert.throws(() => calculateDrawer({ ...base, productType: "ceiling-floating" }), /지원 단수/);
  assert.throws(() => calculateDrawer({ ...base, productType: "island-handle", cabinetQuantity: 1.5 }), /세대 수/);
});

test("drawing authentication leaves the POST body readable and preserves all launch information", async () => {
  let snapshot;
  const handlers = loadModule("src/lib/api-handlers/drawing-requests.ts", {
    "@/lib/db": { db: {}, executeMutation: async () => ({ success: true }) },
    "./auth": { VERIFY: async authenticatedRequest => {
      assert.equal(authenticatedRequest.headers.get("authorization"), "Bearer test-token");
      assert.equal(authenticatedRequest.bodyUsed, false);
      return new Response(null, { status: 200 });
    } },
    "@/lib/drawing-handoff": { saveDrawingHandoff: async data => { snapshot = data; return "https://balon-design.vercel.app/app#handoff=test"; } },
  });
  const input = { workItemId: "test-work", title: "천정 도면", clientName: "업체", drawingType: "천정형", siteAddress: "현장 주소", boardColor: "네츄럴오크", postColor: "화이트" };
  const incoming = new Request("http://localhost/api/drawing-requests", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" }, body: JSON.stringify(input),
  });
  incoming.clone = () => { throw new Error("Cannot read private member #state from an object whose class did not declare it"); };
  const response = await handlers.POST(incoming);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.ok(body.launchUrl);
  for (const [key, value] of Object.entries(input)) assert.equal(snapshot[key], value);
});

test("drawing launch link contains only a short-lived random key and stores the complete snapshot", async () => {
  const writes = [];
  const { saveDrawingHandoff } = loadModule("src/lib/drawing-handoff.ts", {
    "./db": { executeMutation: async (sql, args) => { writes.push({ sql, args }); } },
  }, { URLSearchParams });
  const snapshot = { id: "request-test", workItemId: "work-test", drawingType: "천정형", siteAddress: "서울 현장", boardColor: "네츄럴오크", postColor: "11 다크그레이" };
  const before = Date.now();
  const url = new URL(await saveDrawingHandoff(snapshot));
  const token = new URLSearchParams(url.hash.slice(1)).get("handoff");
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal(url.origin, "https://balon-design.vercel.app");
  assert.equal(url.pathname, "/app");
  assert.equal(url.search, "");
  const saved = writes.find(write => write.sql.startsWith("INSERT"));
  assert.notEqual(saved.args[1], token);
  assert.deepEqual(JSON.parse(saved.args[2]), snapshot);
  assert.ok(saved.args[3] >= before + 15 * 60 * 1000);
  assert.ok(saved.args[3] <= Date.now() + 15 * 60 * 1000);
});

test("Korean business dates cross midnight independently of host timezone", () => {
  const { getToday } = loadModule("src/lib/date.ts");
  assert.equal(getToday(new Date("2026-10-05T15:01:00Z")), "2026-10-06");
});

test("a successful HTTP response containing a failed save rejects", async () => {
  const { requestApi } = loadModule("src/lib/api-client.ts", {}, {
    fetch: async () => ({ ok: true, json: async () => ({ success: false, message: "저장 실패" }) }),
  });
  await assert.rejects(requestApi("/api/posts"), /저장 실패/);
});

test("empty DB purchase results stay empty and never become sample purchases", async () => {
  const handlers = loadModule("src/lib/api-handlers/purchases.ts", {
    "@/lib/db": { db: {}, executeMutation: async () => ({ success: true }), executeQuery: async () => ({ success: true, rows: [] }) },
  });
  const body = await (await handlers.GET()).json();
  assert.deepEqual(body.data, []);
});

test("DB purchase read errors return failure rather than sample success", async () => {
  const handlers = loadModule("src/lib/api-handlers/purchases.ts", {
    "@/lib/db": { db: {}, executeMutation: async () => ({ success: true }), executeQuery: async () => ({ success: false, error: "offline" }) },
  }, { console: { error() {} } });
  const result = await handlers.GET();
  assert.equal(result.status, 503);
  assert.equal((await result.json()).success, false);
});

test("preview purchase create, partial edit, delete survive a reload in one process", async () => {
  const handlers = loadModule("src/lib/api-handlers/purchases.ts", { "@/lib/db": { db: null } });
  await handlers.POST(request({ id: "test-purchase", itemName: "경첩", mallName: "자재몰", quantity: 2 }));
  await handlers.PUT(request({ id: "test-purchase", quantity: 3 }));
  let rows = (await (await handlers.GET()).json()).data;
  assert.equal(rows[0].quantity, 3);
  assert.equal(rows[0].itemName, "경첩");
  await handlers.DELETE({ url: "http://localhost/api/purchases?id=test-purchase" });
  rows = (await (await handlers.GET()).json()).data;
  assert.deepEqual(rows, []);
});

test("memory work IDs remain stable from creation through update and deletion", () => {
  const { serverStore } = loadModule("src/lib/serverStore.ts");
  const item = serverStore.addWorkItem({ title: "현장 업무", status: "대기" }, "stable-id");
  assert.equal(item.id, "stable-id");
  assert.equal(serverStore.updateWorkItem("stable-id", { status: "오피스" }).status, "오피스");
  assert.equal(serverStore.deleteWorkItem("stable-id"), true);
});

test("a failed work DB insert does not return a success response", async () => {
  const handlers = loadModule("src/lib/api-handlers/posts.ts", {
    "@/lib/db": { db: {}, executeMutation: async () => { throw new Error("offline"); } },
  });
  const result = await handlers.POST(request({ type: "work", title: "현장 업무", assignee: "담당자" }));
  assert.equal(result.status, 500);
  assert.equal((await result.json()).success, false);
});

test("partial purchase edits do not overwrite unspecified DB columns", async () => {
  const writes = [];
  const handlers = loadModule("src/lib/api-handlers/purchases.ts", {
    "@/lib/db": { db: {}, executeMutation: async (sql, args) => { writes.push({ sql, args }); return { success: true }; } },
  });
  await handlers.PUT(request({ id: "purchase", quantity: 4 }));
  assert.match(writes[0].sql, /SET quantity = \? WHERE id = \?/);
  assert.equal(writes[0].args.join(","), "4,purchase");
});

test("ready-to-ship work does not count as completed installation", () => {
  const { getDashboardMetrics } = loadModule("src/lib/dataStore.ts");
  const metrics = getDashboardMetrics([
    { status: "준비완료" }, { status: "시공완료" },
  ], []);
  assert.equal(metrics.completionRate, 50);
  assert.equal(metrics.kanban.ready.length, 1);
});


test("body editor renders inline image previews and named PDF tiles in a larger writing area", () => {
  const React = nativeRequire("react");
  const { renderToStaticMarkup } = nativeRequire("react-dom/server");
  const { UnifiedBoardEditor } = loadModule("src/components/common/UnifiedBoardEditor.tsx");
  const html = renderToStaticMarkup(React.createElement(UnifiedBoardEditor, {
    description: "현장 요청사항", onChangeDescription() {}, onChangeAttachments() {}, minRows: 9,
    attachments: [
      { id: "image", name: "현장.png", url: "/test-image.png", fileType: "image" },
      { id: "pdf", name: "제작도면.pdf", url: "/test-drawing.pdf", fileType: "pdf" },
    ],
  }));
  assert.match(html, /contentEditable="true"/);
  assert.match(html, /min-height:15.75rem/);
  assert.match(html, /<img[^>]+data-body-image="image"/);
  assert.doesNotMatch(html, /현장.png/);
  assert.match(html, /제작도면.pdf 열기/);
  assert.match(html, /download="제작도면.pdf"/);
  assert.match(html, /aria-label="제작도면.pdf 다운로드"/);
  assert.match(html, />PDF<\/span>/);
  assert.match(html, /본문에 사진·파일 추가/);
});

test("only drawing tasks display drawing integration, and body comes before optional details", () => {
  const React = nativeRequire("react");
  const { renderToStaticMarkup } = nativeRequire("react-dom/server");
  const item = { id: "fixture", title: "검증 업무", status: "대기", dueDate: "2026-12-01", cardType: "기타", attachments: [], comments: [] };
  const { TaskDetailModal } = loadModule("src/components/dashboard/TaskDetailModal.tsx", {
    "@/context/DataContext": { useData: () => ({ workItems: [item], updateWorkItem() {}, isSaving: false }) },
    "@/context/AuthContext": { useAuth: () => ({ user: null }) },
    "@/components/dashboard/MaterialOrderManager": { MaterialOrderManager: () => null },
  });
  const render = () => renderToStaticMarkup(React.createElement(TaskDetailModal, { item, onClose() {} }));
  assert.doesNotMatch(render(), /도면 정보 ·/);
  item.cardType = "도면";
  const html = render();
  assert.match(html, /도면 정보 ·/);
  assert.ok(html.indexOf("기본정보 · 업무 내용") < html.indexOf("도면 정보 ·"));
  assert.match(html, /aria-label="현재 업무 상태"/);
});


test("image positions survive storage and legacy text remains safe", () => {
  const { bodyHtml, imageMarker, bodyText, bodyImageIds } = loadModule("src/lib/body-content.ts");
  const attachments = [{ id: "photo-1", name: "hidden-name.png", url: "/photo.png", fileType: "image" }];
  const body = `이미지 앞\n${imageMarker("photo-1")}\n이미지 뒤`;
  const html = bodyHtml(body, attachments);
  assert.ok(html.indexOf("이미지 앞") < html.indexOf("<img"));
  assert.ok(html.indexOf("<img") < html.indexOf("이미지 뒤"));
  assert.equal(bodyText(body), "이미지 앞\n\n이미지 뒤");
  assert.deepEqual([...bodyImageIds(body)], ["photo-1"]);
  assert.doesNotMatch(html, /hidden-name/);
  assert.match(bodyHtml('<script>alert("x")</script>', attachments), /&lt;script&gt;/);
  assert.doesNotMatch(bodyHtml("", [{ ...attachments[0], url: 'javascript:alert("x")' }]), /<img/);
  assert.match(bodyHtml("기존 메모", attachments), /기존 메모.*<img/);
});


const authEnvironment = { process: { env: { NODE_ENV: "test", JWT_SECRET: "test-only-signing-secret" } } };
const approvedStaff = { id: 42, login_id: "staff-account", name: "등록 직원", client_id: null, status: "APPROVED", password: "correct-password" };
function authHandlers(rows, success = true, connected = true) {
  return loadModule("src/lib/api-handlers/auth.ts", {
    "@/lib/db": { db: connected ? {} : null, executeQuery: async () => ({ success, rows }) },
  }, authEnvironment);
}

test("unregistered, client, pending, missing membership and wrong-password accounts cannot sign in", async () => {
  for (const rows of [[], [{ ...approvedStaff, client_id: 99 }], [{ ...approvedStaff, status: "PENDING" }], [{ ...approvedStaff, client_id: undefined }], [approvedStaff, approvedStaff]]) {
    const response = await authHandlers(rows).LOGIN(request({ loginId: "staff-account", password: "correct-password" }));
    assert.equal(response.status, 401);
    assert.equal((await response.json()).token, undefined);
  }
  assert.equal((await authHandlers([approvedStaff]).LOGIN(request({ loginId: "staff-account", password: "incorrect" }))).status, 401);
  assert.equal((await authHandlers([approvedStaff]).LOGIN(request({ loginId: "staff-account" }))).status, 400);
});

test("DB outage or unconfigured DB never grants a mock staff session", async () => {
  for (const handlers of [authHandlers([], false), authHandlers([], true, false)]) {
    const response = await handlers.LOGIN(request({ loginId: "김진우", password: "anything" }));
    assert.equal(response.status, 503);
    assert.equal((await response.json()).token, undefined);
  }
});

test("approved staff credentials issue a token, but revoked staff cannot restore it", async () => {
  const handlers = authHandlers([approvedStaff]);
  const response = await handlers.LOGIN(request({ loginId: "staff-account", password: "correct-password" }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.user.password, undefined);
  assert.equal(handlers.verifyToken(body.token).id, 42);
  assert.equal(handlers.verifyToken(body.token + "modified"), null);
  const verification = { url: `http://localhost/api/auth?token=${encodeURIComponent(body.token)}`, headers: new Headers(), cookies: { get() {} } };
  assert.equal((await handlers.VERIFY(verification)).status, 200);
  assert.equal((await authHandlers([{ ...approvedStaff, client_id: 3 }]).VERIFY(verification)).status, 401);
  assert.equal((await authHandlers([{ ...approvedStaff, status: "PENDING" }]).VERIFY(verification)).status, 401);
  assert.equal((await authHandlers([], false).VERIFY(verification)).status, 503);
});

test("login UI has no staff chooser and requires a password", () => {
  const React = nativeRequire("react");
  const { renderToStaticMarkup } = nativeRequire("react-dom/server");
  const { default: LoginPage } = loadModule("src/app/login/page.tsx", {
    "@/context/AuthContext": { useAuth: () => ({ user: null, login() {} }) },
    "next/navigation": { useRouter: () => ({ push() {} }) },
  });
  const html = renderToStaticMarkup(React.createElement(LoginPage));
  assert.doesNotMatch(html, /빠른 선택|김진우|이민아|내선번호|토큰 발행/);
  assert.match(html, /type="password"/);
  assert.match(html, /autoComplete="current-password"/);
  assert.match(html, /required=""/);
});

test("staff directory is inaccessible without a verified staff session", async () => {
  let queried = false;
  const handlers = loadModule("src/lib/api-handlers/users.ts", {
    "@/lib/db": { executeQuery: async () => { queried = true; return { success: true, rows: [] }; } },
    "@/lib/api-handlers/auth": { VERIFY: async () => new Response("{}", { status: 401 }) },
  });
  assert.equal((await handlers.GET({})).status, 401);
  assert.equal(queried, false);
});

test("work board opens in list view while keeping the kanban switch available", () => {
  const React = nativeRequire("react");
  const { renderToStaticMarkup } = nativeRequire("react-dom/server");
  const { default: WorkBoardPage } = loadModule("src/app/work/page.tsx", {
    "@/context/DataContext": { useData: () => ({ workItems: [], isSaving: false }) },
    "@/components/dashboard/WorkOverview": { WorkOverview: () => null },
    "@/components/dashboard/KanbanBoard": { KanbanBoard: () => React.createElement("div", null, "kanban-content") },
    "@/components/dashboard/MaterialOrderManager": { MaterialOrderManager: () => null },
    "@/components/dashboard/TaskDetailModal": { TaskDetailModal: () => null },
  });
  const html = renderToStaticMarkup(React.createElement(WorkBoardPage));
  assert.match(html, /<table/);
  assert.match(html, /업무 \/ 프로젝트명/);
  assert.doesNotMatch(html, /kanban-content/);
  assert.match(html, /칸반 투두 보드/);
});

test("AS details show request, resolution, contact, dates and actions", () => {
  const React = nativeRequire("react");
  const { renderToStaticMarkup } = nativeRequire("react-dom/server");
  const { AsDetailModal } = loadModule("src/components/as/AsDetailModal.tsx");
  const html = renderToStaticMarkup(React.createElement(AsDetailModal, {
    item: { id: "as-test", clientName: "검증 업체", siteAddress: "검증 현장", constructDate: "2026-10-01", asDate: "2026-10-15", createdAt: "2026-10-09", reason: "도어 조절 요청", resolutionDetails: "경첩 조절 완료", technician: "검증 기사", contactPhone: "010-0000-0000", resultStatus: "처리중", priority: "보통" },
    onClose() {}, onEdit() {}, onPrint() {}, onOpenPhoto() {},
  }));
  assert.match(html, /role="dialog"/);
  for (const text of ["검증 업체", "도어 조절 요청", "경첩 조절 완료", "검증 기사", "2026-10-15", "접수증 인쇄", "A\/S 상세 닫기"]) assert.ok(html.includes(text));
});

test("client lookup never substitutes example companies for missing or failed DB", async () => {
  for (const db of [null, {}]) {
    const handlers = loadModule("src/lib/api-handlers/clients.ts", {
      "@/lib/db": { db, executeQuery: async () => ({ success: false }) },
    });
    const response = await handlers.GET({ url: "http://localhost/api/clients" });
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.success, false);
    assert.deepEqual(body.clients, []);
  }
});

test("a valid empty client directory stays empty", async () => {
  const handlers = loadModule("src/lib/api-handlers/clients.ts", {
    "@/lib/db": { db: {}, executeQuery: async () => ({ success: true, rows: [] }) },
  });
  const response = await handlers.GET({ url: "http://localhost/api/clients" });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).clients, []);
});

test("missing upload data cannot create a successful fake attachment URL", async () => {
  const handler = loadModule("src/lib/api-handlers/upload.ts");
  const response = await handler.POST({ headers: new Headers({ "content-type": "application/json" }), json: async () => ({ fileName: "missing.pdf" }) });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).success, false);
});

test("kanban flags overdue active work but never completed work", () => {
  const React = nativeRequire("react");
  const { renderToStaticMarkup } = nativeRequire("react-dom/server");
  const { KanbanBoard } = loadModule("src/components/dashboard/KanbanBoard.tsx", {
    "@/context/DataContext": { useData: () => ({}) },
    "@/context/AuthContext": { useAuth: () => ({ user: null }) },
    "@/lib/date": { getToday: () => "2026-10-10", getDaysUntil: (date) => date ? (Date.parse(date) - Date.parse("2026-10-10")) / 86400000 : null },
    "@/components/dashboard/TaskDetailModal": { TaskDetailModal: () => null },
  });
  const item = { id: "test", title: "검증 업무", status: "대기", dueDate: "2026-10-08", priority: "보통", category: "제작" };
  const render = (task) => renderToStaticMarkup(React.createElement(KanbanBoard, { items: [task], showCompleted: true }));
  assert.match(render(item), /2일 지연/);
  assert.doesNotMatch(render({ ...item, status: "시공완료", priority: "긴급" }), /2일 지연|D-/);
  assert.doesNotMatch(render({ ...item, dueDate: "" }), /D-null|NaN/);
});

test("manual plywood registration persists name, SKU and image across handler reload", async () => {
  const rows = new Map();
  const database = { db: {},
    executeMutation: async (sql, args) => { if (sql.startsWith("INSERT")) rows.set(args[1], { id: args[0], data: args[3] }); return { success: true }; },
    executeQuery: async (sql, args) => ({ success: true, rows: sql.includes("bo_plywood_official") ? (args?.[0] === "BL-30" ? [{ id: "balon-28" }] : []) : sql.includes("bo_plywood_image_overrides") ? [] : sql.startsWith("SELECT id") ? (rows.has(args[0]) ? [rows.get(args[0])] : []) : [...rows.values()] }),
  };
  const mocks = { "@/lib/db": database, "./auth": { VERIFY: async () => ({ ok: true }) } };
  const handler = loadModule("src/lib/api-handlers/plywoods.ts", mocks);
  const image = "data:image/png;base64,iVBORw0KGgo=";
  const created = await handler.POST(request({ name: "검증 합판", code: "test-99", color: "#eeeeee", image }));
  assert.equal(created.status, 201);
  const reloaded = loadModule("src/lib/api-handlers/plywoods.ts", mocks);
  const data = (await (await reloaded.GET()).json()).data;
  assert.equal(data[0].name, "검증 합판");
  assert.equal(data[0].code, "TEST-99");
  assert.equal(data[0].image, image);
  assert.equal((await reloaded.POST(request({ name: "중복", code: "TEST-99" }))).status, 409);
  assert.equal((await reloaded.POST(request({ name: "공식 중복", code: "BL-30" }))).status, 409);
});

test("manual plywood rejects anonymous writes, invalid input and DB failures", async () => {
  const denied = new Response(null, { status: 401 });
  const unauthenticated = loadModule("src/lib/api-handlers/plywoods.ts", { "./auth": { VERIFY: async () => denied }, "@/lib/db": { db: null } });
  assert.equal((await unauthenticated.POST(request({}))).status, 401);
  const handler = loadModule("src/lib/api-handlers/plywoods.ts", { "./auth": { VERIFY: async () => ({ ok: true }) }, "@/lib/db": { db: null } });
  assert.equal((await handler.POST(request({ name: "품번 없음" }))).status, 400);
  assert.equal((await handler.POST(request({ name: "잘못된 이미지", code: "NEW-1", image: "https://invalid.example/image.svg" }))).status, 400);
  assert.equal((await handler.POST(request({ name: "연결 실패", code: "NEW-1" }))).status, 503);
});

test("official plywood image overrides persist by ID without mixing duplicate SKUs", async () => {
  const overrides = new Map();
  const mocks = {
    "./auth": { VERIFY: async () => ({ ok: true }) },
    "@/lib/db": { db: {},
      executeMutation: async (sql, args) => { if (sql.startsWith("INSERT INTO bo_plywood_image_overrides")) overrides.set(args[0], args[1]); return { success: true }; },
      executeQuery: async (sql, args) => ({ success: true, rows: sql.includes("bo_plywood_official") ? (!args || args[0] === "balon-28" ? [{ data: JSON.stringify({ id: "balon-28", code: "BL-30", name: "스카이블루", image: "/original.jpg" }) }] : []) : sql.includes("overrides") ? [...overrides].map(([id, image]) => ({ id, image })) : [] }),
    },
  };
  const image = "data:image/png;base64,iVBORw0KGgo=";
  const handler = loadModule("src/lib/api-handlers/plywoods.ts", mocks);
  const response = await handler.PUT(request({ id: "balon-28", image, name: "무시할 이름", code: "잘못된 품번" }));
  assert.equal(response.status, 200);
  const saved = (await response.json()).data;
  assert.equal(saved.name, "스카이블루");
  assert.equal(saved.code, "BL-30");
  const reloaded = loadModule("src/lib/api-handlers/plywoods.ts", mocks);
  const data = (await (await reloaded.GET()).json()).data;
  assert.equal(data.length, 1);
  assert.equal(data[0].id, "balon-28");
  assert.equal(data[0].image, image);
  assert.equal((await handler.PUT(request({ id: "missing", image }))).status, 404);
  assert.equal((await handler.PUT(request({ id: "balon-28", image: "javascript:bad" }))).status, 400);
});

test("manual plywood image edit changes only image and requires staff authentication", async () => {
  const original = { id: "manual-test", code: "TEST", name: "기존 합판", image: null, color: "#ffffff" };
  let mutation;
  const handler = loadModule("src/lib/api-handlers/plywoods.ts", {
    "./auth": { VERIFY: async () => ({ ok: true }) },
    "@/lib/db": { db: {}, executeQuery: async (sql) => ({ success: true, rows: sql.includes("bo_plywood_official") ? [] : [{ data: JSON.stringify(original) }] }), executeMutation: async (sql, args) => { if (sql.startsWith("UPDATE")) mutation = { sql, args }; return { success: true }; } },
  });
  const image = "data:image/png;base64,iVBORw0KGgo=";
  const response = await handler.PUT(request({ id: original.id, image }));
  assert.equal(response.status, 200);
  assert.match(mutation.sql, /json_set\(data, '\$\.image'/);
  assert.equal(mutation.args[1], original.id);
  assert.equal((await response.json()).data.name, original.name);
  const denied = loadModule("src/lib/api-handlers/plywoods.ts", { "./auth": { VERIFY: async () => new Response(null, { status: 401 }) }, "@/lib/db": { db: null } });
  assert.equal((await denied.PUT(request({ id: original.id, image }))).status, 401);
});


test("plywood listing uses DB records and never silently substitutes local catalog", async () => {
  const failed = loadModule("src/lib/api-handlers/plywoods.ts", { "@/lib/db": { db: {}, executeMutation: async () => ({}), executeQuery: async () => ({ success: false, rows: [] }) } });
  assert.equal((await failed.GET()).status, 503);
  const empty = loadModule("src/lib/api-handlers/plywoods.ts", { "@/lib/db": { db: {}, executeMutation: async () => ({}), executeQuery: async () => ({ success: true, rows: [] }) } });
  assert.deepEqual((await (await empty.GET()).json()).data, []);
});
