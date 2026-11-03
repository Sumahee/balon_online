import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const nativeRequire = createRequire(import.meta.url);
function load(path, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  new Function("require", "module", "exports", code)(name => name in mocks ? mocks[name] : nativeRequire(name), module, module.exports);
  return module.exports;
}
const dates = load("src/lib/date.ts");
const model = load("src/lib/as-report.ts", { "./date": dates });
const item = (id, receivedDate, extra = {}) => ({ id, receivedDate, type: "as", clientName: "시험업체", constructDate: "2025-01-10", siteAddress: "서울특별시 시험로 123", reason: "문짝 조정 요청", resultStatus: "접수", priority: "보통", createdAt: "2026-11-01T15:30:00Z", ...extra });

test("AS report defaults to the Korean business week's Monday through Saturday across Sunday and year boundaries", () => {
  assert.deepEqual(model.defaultAsReportRange("2026-11-03"), { start: "2026-11-02", end: "2026-11-07" });
  assert.deepEqual(model.defaultAsReportRange("2026-11-08"), { start: "2026-11-02", end: "2026-11-07" });
  assert.deepEqual(model.defaultAsReportRange("2026-11-09"), { start: "2026-11-09", end: "2026-11-14" });
  assert.deepEqual(model.defaultAsReportRange("2027-01-01"), { start: "2026-12-28", end: "2027-01-02" });
  assert.deepEqual(model.defaultAsReportRange(dates.getToday(new Date("2026-11-01T15:01:00Z"))), { start: "2026-11-02", end: "2026-11-07" });
});

test("AS report uses explicit receipt dates and only falls back for legacy records with Korean creation dates", () => {
  assert.equal(model.asReceivedDate(item("1", "2026-10-30")), "2026-10-30");
  assert.equal(model.asReceivedDate(item("2", "")), "2026-11-02");
  assert.equal(model.asReceivedDate(item("3", undefined, { createdAt: "2026-11-01 15:30:00" })), "2026-11-02");
  assert.equal(model.asReceivedDate(item("4", undefined, { createdAt: "2026-11-01" })), "2026-11-01");
  assert.equal(model.asReceivedDate(item("5", "2026-02-30")), "");
  assert.equal(model.asReceivedDate(item("6", "", { createdAt: "invalid" })), "");
});

test("AS report includes both range endpoints, clips partial weeks and explicitly counts Sunday and undated exclusions", () => {
  const records = [item("a", "2026-11-04"), item("b", "2026-11-07"), item("sun", "2026-11-08"), item("c", "2026-11-09", { resultStatus: "처리중", priority: "긴급" }), item("d", "2026-11-10", { resultStatus: "완료" }), item("before", "2026-11-03"), item("after", "2026-11-11"), item("unknown", "invalid")];
  const original = JSON.stringify(records);
  const report = model.buildAsReport(records, "2026-11-04", "2026-11-10");
  assert.deepEqual(report.weeks.map(w => [w.start, w.end, w.from, w.to, w.items.map(i => i.id)]), [
    ["2026-11-02", "2026-11-07", "2026-11-04", "2026-11-07", ["a", "b"]],
    ["2026-11-09", "2026-11-14", "2026-11-09", "2026-11-10", ["c", "d"]],
  ]);
  assert.deepEqual(report.summary, { total: 4, received: 2, processing: 1, completed: 1, urgent: 1 });
  assert.equal(report.excludedSundays, 1);
  assert.equal(report.undated, 1);
  assert.equal(JSON.stringify(records), original);
});

test("AS report retains empty weeks, handles Sunday-only ranges and sorts deterministically without duplicates", () => {
  const report = model.buildAsReport([item("b", "2026-11-02"), item("a", "2026-11-02"), item("z", "2026-11-14")], "2026-11-02", "2026-11-21");
  assert.deepEqual(report.weeks.map(w => w.items.map(i => i.id)), [["a", "b"], ["z"], []]);
  assert.equal(report.summary.total, 3);
  const sunday = model.buildAsReport([item("sun", "2026-11-08")], "2026-11-08", "2026-11-08");
  assert.equal(sunday.weeks.length, 0);
  assert.equal(sunday.excludedSundays, 1);
});

test("AS report rejects invalid, reversed and oversized ranges and accepts leap days", () => {
  for (const [start, end] of [["", "2026-11-07"], ["2026-02-30", "2026-11-07"], ["2026-11-07", "2026-11-02"], ["2025-01-01", "2026-11-07"]]) assert.throws(() => model.buildAsReport([], start, end));
  assert.equal(model.asReportRangeError("2028-02-29", "2028-03-04"), "");
});

test("AS weekly report renders all business fields as escaped native text with repeated table headings", () => {
  const styles = new Proxy({}, { get: (_, name) => name === "__esModule" ? false : name });
  const { AsWeeklyReport } = load("src/components/as/AsWeeklyReport.tsx", { "@/lib/as-report": model, "./as-report.module.css": styles });
  const report = model.buildAsReport([item("a", "2026-11-02", { clientName: "<script>alert(1)</script>", asDate: "2026-11-06", installer: "원시공자", contactPhone: "010-1234-5678", technician: "시험기사", resolutionDetails: "힌지 교체\n조정 완료", serviceType: "유상", paidReason: "고객과실" })], "2026-11-02", "2026-11-14");
  const html = renderToStaticMarkup(React.createElement(AsWeeklyReport, { report, generatedAt: "2026-11-03T00:00:00Z" }));
  assert.equal((html.match(/<thead>/g) || []).length, 2);
  for (const text of ["접수일 기준", "힌지 교체\n조정 완료", "원시공자", "시험기사", "유상", "고객과실", "010-1234-5678", "2026-11-06", "해당 기간에 접수된 A/S가 없습니다."]) assert.ok(html.includes(text), text);
  assert.ok(html.includes("&lt;script&gt;"));
  assert.doesNotMatch(html, /<(?:script|canvas|img)\b/);
});
