import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { Script } from "node:vm";
import ts from "typescript";

const nativeRequire = createRequire(import.meta.url);
function load(file, mocks = {}, cache = new Map()) {
  const path = [resolve(file), resolve(file).replace(/\.ts$/, ".tsx")].find(existsSync);
  if (cache.has(path)) return cache.get(path).exports;
  const loaded = { exports: {} }; cache.set(path, loaded);
  const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const require = name => name in mocks ? mocks[name] : name.startsWith("@/") ? load(`src/${name.slice(2)}.ts`, mocks, cache) : name.startsWith("./") ? load(resolve(path, "..", `${name}.ts`), mocks, cache) : nativeRequire(name);
  new Script(`(function(require,module,exports){${code}\n})`).runInNewContext({ console, Date })(require, loaded, loaded.exports);
  return loaded.exports;
}
function hooks() {
  const state = []; let cursor = 0;
  return {
    reset() { cursor = 0; },
    react: { ...nativeRequire("react"),
      useState(initial) { const i = cursor++; if (!(i in state)) state[i] = typeof initial === "function" ? initial() : initial; return [state[i], next => state[i] = typeof next === "function" ? next(state[i]) : next]; },
      useRef(initial) { const i = cursor++; return state[i] ?? (state[i] = { current: initial }); },
      useMemo: compute => compute(),
    },
  };
}
const walk = node => Array.isArray(node) ? node.flatMap(walk) : node && typeof node === "object" ? [node, ...walk(node.props?.children)] : [];
const photo = name => ({ name, type: "image/png", size: 100 });
const tick = () => new Promise(resolve => setImmediate(resolve));
function event(files = [], useItems = true) {
  const data = { types: ["Files"], files, items: useItems ? files.map(file => ({ kind: "file", getAsFile: () => file })) : [] };
  return { clipboardData: data, dataTransfer: data, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } };
}

test("photo input consumes images once, preserves text paste, accepts file-list fallback and blocks disabled drops", () => {
  const h = hooks(), added = [];
  const { PhotoInputArea } = load("src/components/common/PhotoInputArea.tsx", { react: h.react });
  const render = (disabled = false) => { h.reset(); return PhotoInputArea({ label: "접수 사진", disabled, onFiles: files => added.push(Array.from(files)), children: null }); };
  const screenshot = photo("screenshot");
  for (const useItems of [true, false]) {
    const paste = event([screenshot], useItems); render().props.onPaste(paste);
    assert.equal(paste.prevented, true); assert.equal(paste.stopped, true);
  }
  assert.deepEqual(added, [[screenshot], [screenshot]]);
  const text = event(); text.clipboardData.items = [{ kind: "string" }];
  render().props.onPaste(text); assert.equal(text.prevented, false); assert.equal(text.stopped, false);
  render().props.onDragEnter(event([screenshot])); assert.match(render().props.className, /bg-blue-50/);
  const drop = event([screenshot]); render().props.onDrop(drop);
  assert.equal(drop.prevented, true); assert.equal(drop.stopped, true); assert.equal(added.length, 3);
  assert.ok(!render().props.className.includes("bg-blue-50"));
  render(true).props.onPaste(event([screenshot])); render(true).props.onDrop(event([screenshot]));
  assert.equal(added.length, 3);
  const over = event([screenshot]); render(true).props.onDragOver(over); assert.equal(over.dataTransfer.dropEffect, "none");
});

test("AS paste and drop stay in their chosen group, obey the count limit and keep existing photos on invalid drops", async () => {
  const h = hooks(); let photos = ["existing"], label = "A/S 접수 사진", disabled = false;
  const { AsPhotoEditor } = load("src/components/as/AsPhotoEditor.tsx", {
    react: h.react, "@/components/common/PhotoImage": { PhotoImage: () => null },
    "@/lib/photo-compression": { readPhotoFile: async file => file.name, compressPhoto: async name => `compressed-${name}` },
  });
  const render = () => {
    h.reset(); const nodes = walk(AsPhotoEditor({ label, photos, disabled, onChange: next => { photos = Array.from(next); }, onBusyChange() {} }));
    const area = nodes.find(n => n.props?.onFiles);
    return [...nodes, ...walk(area.type(area.props))];
  };
  const zone = () => render().find(n => n.props?.role === "group");
  zone().props.onPaste(event([photo("paste")])); await tick();
  zone().props.onDrop(event([photo("drop")])); await tick();
  assert.deepEqual(photos, ["existing", "compressed-paste", "compressed-drop"]);
  zone().props.onDrop(event([photo("four"), photo("five")])); await tick();
  assert.equal(photos.length, 3); assert.ok(render().some(n => n.props?.role === "alert"));
  zone().props.onDrop(event([{ name: "file.pdf", type: "application/pdf", size: 100 }])); await tick();
  assert.equal(photos.length, 3);
  const intake = photos; label = "조치 후 사진"; photos = [];
  zone().props.onPaste(event([photo("result")], false)); await tick();
  assert.deepEqual(photos, ["compressed-result"]); assert.equal(intake.length, 3);
  disabled = true; zone().props.onDrop(event([photo("blocked")])); await tick(); assert.equal(photos.length, 1);
});

test("purchase photo preparation blocks save and close, preserves edits and retries failed saves with photos", async () => {
  const h = hooks(), saved = []; let release, failSave = true, blockCompression = true;
  function Header() { return null; }
  const { default: PurchasesPage } = load("src/app/purchases/page.tsx", {
    react: h.react, "@/components/common/PageHeader": { PageHeader: Header }, "./PurchaseDetailModal": { PurchaseDetailModal: () => null },
    "@/context/DataContext": { useData: () => ({ purchaseItems: [], isSaving: false, addPurchaseItem: async item => { saved.push(item); if (failSave) throw Error("offline"); } }) },
    "@/lib/photo-compression": { readPhotoFile: async file => file.name, compressPhoto: async name => { if (blockCompression) { blockCompression = false; await new Promise(resolve => release = resolve); } if (name === "bad") throw Error("bad image"); return `compressed-${name}`; } },
  });
  const render = () => { h.reset(); return walk(PurchasesPage()); };
  const form = () => render().find(n => n.type === "form");
  const input = placeholder => render().find(n => n.props?.placeholder?.includes(placeholder));
  render().find(n => n.type === Header).props.actions.props.children.props.onClick();
  input("벤딩끈").props.onChange({ target: { value: "시험 자재" } });
  const text = event(); form().props.onPaste(text); assert.equal(text.prevented, false);
  form().props.onPaste(event([photo("first"), photo("second")])); await tick();
  const busyRender = render(); assert.equal(busyRender.find(n => n.props?.type === "submit").props.disabled, true);
  busyRender.find(n => n.props?.["aria-label"] === "구매 등록·수정 닫기").props.onClick();
  await form().props.onSubmit({ preventDefault() {} }); assert.equal(saved.length, 0); assert.ok(form());
  form().props.onPaste(event([photo("duplicate")]));
  input("중국산").props.onChange({ target: { value: "사진 준비 중 입력한 메모" } });
  release(); await tick();
  await form().props.onSubmit({ preventDefault() {} });
  assert.equal(saved.length, 1); assert.deepEqual(Array.from(saved[0].photos), ["compressed-first", "compressed-second"]);
  assert.equal(saved[0].notes, "사진 준비 중 입력한 메모"); assert.ok(form());
  // Reject the whole new batch; the original attachments remain available for retry.
  form().props.onPaste(event([photo("good"), photo("bad")])); await tick();
  assert.ok(render().some(n => n.props?.role === "alert"));
  failSave = false; await form().props.onSubmit({ preventDefault() {} });
  assert.deepEqual(Array.from(saved[1].photos), ["compressed-first", "compressed-second"]); assert.equal(form(), undefined);
});

test("editing a purchase keeps old photos, appends dropped and selected files, and saves explicit removal", async () => {
  const h = hooks(), saved = [];
  const existing = { id: "purchase", itemName: "기존 자재", mallName: "쇼핑몰", storeName: "상호", photos: ["old-photo"] };
  const { default: PurchasesPage } = load("src/app/purchases/page.tsx", {
    react: h.react, "@/components/common/PageHeader": { PageHeader: () => null }, "./PurchaseDetailModal": { PurchaseDetailModal: () => null },
    "@/context/DataContext": { useData: () => ({ purchaseItems: [existing], isSaving: false, updatePurchaseItem: async (id, item) => saved.push({ id, ...item }) }) },
    "@/lib/photo-compression": { readPhotoFile: async file => file.name, compressPhoto: async name => `compressed-${name}` },
  });
  const render = () => {
    h.reset(); const nodes = walk(PurchasesPage()); const area = nodes.find(n => n.props?.onFiles);
    return area ? [...nodes, ...walk(area.type(area.props))] : nodes;
  };
  render().find(n => n.props?.title === "수정").props.onClick();
  render().find(n => n.props?.role === "group").props.onDrop(event([photo("dropped")])); await tick();
  const selection = { target: { files: [photo("selected")], value: "same-file" } };
  render().find(n => n.props?.type === "file").props.onChange(selection); await tick(); assert.equal(selection.target.value, "");
  render().find(n => n.props?.["aria-label"] === "자재 사진 2 제거").props.onClick();
  await render().find(n => n.type === "form").props.onSubmit({ preventDefault() {} });
  assert.equal(saved[0].id, existing.id); assert.deepEqual(Array.from(saved[0].photos), ["old-photo", "compressed-selected"]);
});
