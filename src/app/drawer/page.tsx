"use client";

import React, { useState, useMemo } from "react";
import {
  Calculator,
  Layers,
  Copy,
  Printer,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  Sliders,
  Settings2,
  Box,
  Eye,
} from "lucide-react";
import { DrawerCalcInput, DrawerCalcResult } from "@/types";
import { calculateDrawer } from "@/lib/drawerEngine";
import { cn } from "@/lib/utils";

const PRESETS: { label: string; values: DrawerCalcInput }[] = [
  {
    label: "표준 3단 주방 서랍장 (800 × 850 × 600)",
    values: {
      cabinetWidth: 800,
      cabinetHeight: 850,
      cabinetDepth: 600,
      boardThickness: 18,
      drawerCount: 3,
      railType: "undermount",
      marginGap: 3,
    },
  },
  {
    label: "아일랜드 2단 광폭 대형 서랍 (900 × 750 × 600)",
    values: {
      cabinetWidth: 900,
      cabinetHeight: 750,
      cabinetDepth: 600,
      boardThickness: 18,
      drawerCount: 2,
      railType: "undermount",
      marginGap: 3,
    },
  },
  {
    label: "슬림 4단 수납 서랍장 (600 × 900 × 500)",
    values: {
      cabinetWidth: 600,
      cabinetHeight: 900,
      cabinetDepth: 500,
      boardThickness: 15,
      drawerCount: 4,
      railType: "ball3stage",
      marginGap: 2.5,
    },
  },
];

export default function DrawerAutomationPage() {
  const [inputs, setInputs] = useState<DrawerCalcInput>({
    cabinetWidth: 800,
    cabinetHeight: 850,
    cabinetDepth: 600,
    boardThickness: 18,
    drawerCount: 3,
    railType: "undermount",
    marginGap: 3,
  });

  const [copied, setCopied] = useState(false);
  const [viewAngle, setViewAngle] = useState<"front" | "side">("front");

  // Real-time calculated result
  const result: DrawerCalcResult = useMemo(() => {
    return calculateDrawer(inputs);
  }, [inputs]);

  const handleCopyClipboard = () => {
    const textLines = [
      `=== [BARON INT] 서랍장 부재 재단 및 부속 산출표 ===`,
      `캐비닛 외경: ${inputs.cabinetWidth} x ${inputs.cabinetHeight} x ${inputs.cabinetDepth} mm (${inputs.boardThickness}T, ${inputs.drawerCount}단)`,
      `적용 레일: ${result.railSpec.name}`,
      ``,
      `[재단 부재 목록]`,
      `부재명\t수량\t가로(W)\t세로/깊이(D)\t두께(T)\t자재/특이사항`,
      ...result.parts.map(
        (p) =>
          `${p.name}\t${p.count}개\t${p.width}mm\t${p.depth}mm\t${p.thickness}T\t${p.material} (${p.notes})`
      ),
      ``,
      `[소요 하드웨어]`,
      ...result.hardware.map((h) => `${h.name}: ${h.count}개 (${h.notes})`),
    ].join("\n");

    navigator.clipboard.writeText(textLines).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">
                  서랍장 자동화 산출 툴 (Drawer CAD Engine)
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  정밀 자동 계산
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                가구 외경 및 판재 규격을 입력하면 레일 표준 규격, 판재 정밀 절단 치수, 부속 목록을 자동 계산합니다.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyClipboard}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "클립보드 복사 완료!" : "재단 목록 복사"}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>발주서 출력</span>
          </button>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-slate-500 shrink-0 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          빠른 프리셋:
        </span>
        {PRESETS.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => setInputs(preset.values)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:border-amber-400 hover:text-amber-900 transition shrink-0 cursor-pointer shadow-2xs"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Main Calculation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Input Configuration Form (4 Cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 text-blue-600" />
              <span>치수 및 하드웨어 파라미터</span>
            </h3>
            <button
              onClick={() =>
                setInputs({
                  cabinetWidth: 800,
                  cabinetHeight: 850,
                  cabinetDepth: 600,
                  boardThickness: 18,
                  drawerCount: 3,
                  railType: "undermount",
                  marginGap: 3,
                })
              }
              className="text-slate-400 hover:text-slate-600 p-1"
              title="초기화"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Cabinet Outer Width */}
            <div>
              <div className="flex items-center justify-between font-bold text-slate-700 mb-1">
                <label>가구 외경 가로 (Width)</label>
                <span className="text-blue-600 font-mono text-sm">{inputs.cabinetWidth} mm</span>
              </div>
              <input
                type="range"
                min="300"
                max="1200"
                step="10"
                value={inputs.cabinetWidth}
                onChange={(e) => setInputs({ ...inputs, cabinetWidth: Number(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>300mm</span>
                <span>800mm (표준)</span>
                <span>1200mm</span>
              </div>
            </div>

            {/* Cabinet Outer Height */}
            <div>
              <div className="flex items-center justify-between font-bold text-slate-700 mb-1">
                <label>가구 외경 높이 (Height)</label>
                <span className="text-blue-600 font-mono text-sm">{inputs.cabinetHeight} mm</span>
              </div>
              <input
                type="range"
                min="400"
                max="1200"
                step="10"
                value={inputs.cabinetHeight}
                onChange={(e) => setInputs({ ...inputs, cabinetHeight: Number(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>400mm</span>
                <span>850mm (싱크볼 기준)</span>
                <span>1200mm</span>
              </div>
            </div>

            {/* Cabinet Outer Depth */}
            <div>
              <div className="flex items-center justify-between font-bold text-slate-700 mb-1">
                <label>가구 외경 깊이 (Depth)</label>
                <span className="text-blue-600 font-mono text-sm">{inputs.cabinetDepth} mm</span>
              </div>
              <input
                type="range"
                min="350"
                max="750"
                step="10"
                value={inputs.cabinetDepth}
                onChange={(e) => setInputs({ ...inputs, cabinetDepth: Number(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>350mm</span>
                <span>600mm (표준 주방)</span>
                <span>750mm</span>
              </div>
            </div>

            {/* Board Thickness */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">가구 판재 두께 (외경 골조)</label>
              <div className="grid grid-cols-2 gap-2">
                {[15, 18].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setInputs({ ...inputs, boardThickness: t })}
                    className={cn(
                      "py-2 rounded-lg font-bold border transition cursor-pointer",
                      inputs.boardThickness === t
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {t}T ({t}mm)
                  </button>
                ))}
              </div>
            </div>

            {/* Drawer Count */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">서랍 단수</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setInputs({ ...inputs, drawerCount: count })}
                    className={cn(
                      "py-2 rounded-lg font-bold border transition cursor-pointer text-center",
                      inputs.drawerCount === count
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {count}단
                  </button>
                ))}
              </div>
            </div>

            {/* Rail Selection */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">서랍 슬라이드 레일 방식</label>
              <div className="space-y-2">
                <label
                  className={cn(
                    "flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition",
                    inputs.railType === "undermount"
                      ? "bg-blue-50/70 border-blue-400 text-blue-900"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <input
                    type="radio"
                    name="railType"
                    checked={inputs.railType === "undermount"}
                    onChange={() => setInputs({ ...inputs, railType: "undermount" })}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <div className="font-bold text-xs">언더레일 댐핑형 (블룸/삼홍)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      하부 매립형 레일, 좌우 5mm 유격, 소프트 클로징 내장 (바론 고급형 추천)
                    </div>
                  </div>
                </label>

                <label
                  className={cn(
                    "flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition",
                    inputs.railType === "ball3stage"
                      ? "bg-blue-50/70 border-blue-400 text-blue-900"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <input
                    type="radio"
                    name="railType"
                    checked={inputs.railType === "ball3stage"}
                    onChange={() => setInputs({ ...inputs, railType: "ball3stage" })}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <div className="font-bold text-xs">3단 볼레일 45mm</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      측면 체결형, 좌우 각 12.7mm (총 26mm) 유격 반영
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Margin gap */}
            <div>
              <div className="flex items-center justify-between font-bold text-slate-700 mb-1">
                <label>도어 상하좌우 유격 여백 (Gap)</label>
                <span className="font-mono text-slate-900">{inputs.marginGap} mm</span>
              </div>
              <input
                type="range"
                min="2"
                max="5"
                step="0.5"
                value={inputs.marginGap}
                onChange={(e) => setInputs({ ...inputs, marginGap: Number(e.target.value) })}
                className="w-full accent-slate-700 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right Outputs & Visualization (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Interactive SVG Diagram Visualizer */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  실시간 2D 가구 구조 도면 (Live CAD View)
                </h3>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold text-slate-600">
                <button
                  onClick={() => setViewAngle("front")}
                  className={cn(
                    "px-3 py-1 rounded-md transition cursor-pointer",
                    viewAngle === "front" ? "bg-white text-slate-900 shadow-2xs" : ""
                  )}
                >
                  정면도 (Front)
                </button>
                <button
                  onClick={() => setViewAngle("side")}
                  className={cn(
                    "px-3 py-1 rounded-md transition cursor-pointer",
                    viewAngle === "side" ? "bg-white text-slate-900 shadow-2xs" : ""
                  )}
                >
                  측면 단면도 (Side Section)
                </button>
              </div>
            </div>

            {/* SVG Visualizer Canvas */}
            <div className="h-64 sm:h-72 w-full bg-slate-950 rounded-xl p-4 flex items-center justify-center relative overflow-hidden">
              <div className="absolute top-3 left-3 text-[10px] text-slate-400 font-mono">
                CAD Scale: 1:10 (Auto) | Rail: {result.railSpec.length}mm
              </div>

              {viewAngle === "front" ? (
                /* Front View SVG */
                <svg
                  viewBox="0 0 400 240"
                  className="w-full h-full max-h-56"
                  style={{ overflow: "visible" }}
                >
                  {/* Outer Cabinet Frame */}
                  <rect
                    x="50"
                    y="20"
                    width="300"
                    height="190"
                    rx="2"
                    fill="#1e293b"
                    stroke="#475569"
                    strokeWidth="2"
                  />
                  {/* Inner Cavity */}
                  <rect
                    x="60"
                    y="30"
                    width="280"
                    height="170"
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth="1"
                  />

                  {/* Drawers front panels based on drawer count */}
                  {Array.from({ length: inputs.drawerCount }).map((_, i) => {
                    const drawerSlotH = 160 / inputs.drawerCount;
                    const drawerY = 35 + i * drawerSlotH;
                    const drawerH = drawerSlotH - 4;

                    return (
                      <g key={i}>
                        {/* Drawer Front Plate */}
                        <rect
                          x="64"
                          y={drawerY}
                          width="272"
                          height={drawerH}
                          rx="3"
                          fill="#3b82f6"
                          fillOpacity="0.85"
                          stroke="#60a5fa"
                          strokeWidth="1.5"
                        />
                        {/* Drawer Handle Representation */}
                        <rect
                          x="180"
                          y={drawerY + drawerH / 2 - 3}
                          width="40"
                          height="6"
                          rx="2"
                          fill="#94a3b8"
                        />
                        {/* Drawer Label */}
                        <text
                          x="110"
                          y={drawerY + drawerH / 2 + 4}
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="bold"
                        >
                          {i + 1}단 서랍 앞판 ({Math.round(result.parts[0].width)} × {Math.round(result.parts[0].depth)}mm)
                        </text>
                      </g>
                    );
                  })}

                  {/* Dimension Annotations */}
                  {/* Width callout at top */}
                  <line x1="50" y1="12" x2="350" y2="12" stroke="#38bdf8" strokeWidth="1.5" />
                  <circle cx="50" cy="12" r="2" fill="#38bdf8" />
                  <circle cx="350" cy="12" r="2" fill="#38bdf8" />
                  <text x="180" y="9" fill="#38bdf8" fontSize="10" fontWeight="bold">
                    W: {inputs.cabinetWidth} mm
                  </text>

                  {/* Height callout at right */}
                  <line x1="365" y1="20" x2="365" y2="210" stroke="#f59e0b" strokeWidth="1.5" />
                  <circle cx="365" cy="20" r="2" fill="#f59e0b" />
                  <circle cx="365" cy="210" r="2" fill="#f59e0b" />
                  <text
                    x="372"
                    y="120"
                    fill="#f59e0b"
                    fontSize="10"
                    fontWeight="bold"
                    transform="rotate(90 372 120)"
                  >
                    H: {inputs.cabinetHeight} mm
                  </text>
                </svg>
              ) : (
                /* Side Section Cut View SVG */
                <svg
                  viewBox="0 0 400 240"
                  className="w-full h-full max-h-56"
                  style={{ overflow: "visible" }}
                >
                  {/* Cabinet Depth Frame */}
                  <rect
                    x="60"
                    y="25"
                    width="260"
                    height="180"
                    fill="#1e293b"
                    stroke="#475569"
                    strokeWidth="2"
                  />
                  {/* Back panel (우라) */}
                  <rect x="62" y="32" width="6" height="166" fill="#64748b" />

                  {/* Drawers slide depth depiction */}
                  {Array.from({ length: inputs.drawerCount }).map((_, i) => {
                    const slotH = 160 / inputs.drawerCount;
                    const topY = 35 + i * slotH;
                    const boxH = slotH - 12;

                    return (
                      <g key={i}>
                        {/* Slide Rail Line */}
                        <rect
                          x="95"
                          y={topY + boxH}
                          width="210"
                          height="4"
                          fill="#f59e0b"
                          rx="1"
                        />
                        {/* Drawer Box Body */}
                        <rect
                          x="100"
                          y={topY}
                          width="200"
                          height={boxH}
                          fill="#334155"
                          stroke="#60a5fa"
                          strokeWidth="1"
                          rx="2"
                        />
                        {/* Front plate overhang */}
                        <rect
                          x="305"
                          y={topY - 3}
                          width="12"
                          height={boxH + 6}
                          fill="#3b82f6"
                          rx="1"
                        />
                        <text
                          x="140"
                          y={topY + boxH / 2 + 3}
                          fill="#e2e8f0"
                          fontSize="9"
                          fontWeight="bold"
                        >
                          박스 깊이: {result.boxDimensions.depth}mm
                        </text>
                      </g>
                    );
                  })}

                  {/* Depth callout bottom */}
                  <line x1="60" y1="220" x2="320" y2="220" stroke="#10b981" strokeWidth="1.5" />
                  <circle cx="60" cy="220" r="2" fill="#10b981" />
                  <circle cx="320" cy="220" r="2" fill="#10b981" />
                  <text x="170" y="233" fill="#10b981" fontSize="10" fontWeight="bold">
                    Depth: {inputs.cabinetDepth} mm
                  </text>
                </svg>
              )}
            </div>

            {/* Quick Summary Strip */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">추천 레일 규격:</span>
                <span className="font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {result.railSpec.name}
                </span>
              </div>
              <div className="text-slate-600 text-[11px]">
                서랍 박스 실외경: <strong>{result.boxDimensions.width}</strong>(W) ×{" "}
                <strong>{result.boxDimensions.height}</strong>(H) ×{" "}
                <strong>{result.boxDimensions.depth}</strong>(D) mm
              </div>
            </div>
          </div>

          {/* Cutting List Table (재단 치수표) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  부재별 자동 절단 치수표 (Cut List)
                </h3>
              </div>
              <span className="text-xs text-slate-500">단수: {inputs.drawerCount}단 총 소요</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">부재 명칭</th>
                    <th className="py-3 px-4">소요 수량</th>
                    <th className="py-3 px-4">절단 규격 (가로 W × 세로 D)</th>
                    <th className="py-3 px-4">두께(T)</th>
                    <th className="py-3 px-4">권장 자재 및 메모</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.parts.map((part, pIdx) => (
                    <tr key={pIdx} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{part.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-bold text-xs">
                          {part.count}개
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {part.width} × {part.depth} mm
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{part.thickness}T</td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        <span className="font-medium text-slate-700">{part.material}</span>
                        <span className="text-slate-400 block text-[11px]">{part.notes}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hardware List (부속 하드웨어) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  필요 하드웨어 및 결합 철물 (Hardware Bill)
                </h3>
              </div>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {result.hardware.map((hw, hIdx) => (
                <div key={hIdx} className="p-3.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{hw.name}</span>
                    <span className="text-slate-500 text-[11px] block">{hw.notes}</span>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-xs">
                      {hw.count}개
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{hw.spec}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
