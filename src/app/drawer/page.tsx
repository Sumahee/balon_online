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
  Settings2,
  Box,
  Grid,
  Maximize2,
  Compass,
  LayoutGrid,
} from "lucide-react";
import { DrawerCalcInput, DrawerCalcResult } from "@/types";
import { calculateDrawer } from "@/lib/drawerEngine";
import { DRAWER_TEMPLATES, templateDimensions } from "@/lib/drawerTemplates";
import { cn } from "@/lib/utils";
import DrawerDrawing from "./DrawerDrawing";

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
      hasGrain: true,
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
      hasGrain: true,
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
      hasGrain: false,
    },
  },
];

export default function DrawerAutomationPage() {
  const [inputs, setInputs] = useState<DrawerCalcInput>({
    productType: "ceiling-floor",
    cabinetQuantity: 1,
    cabinetWidth: 580,
    cabinetHeight: 444,
    cabinetDepth: 400,
    boardThickness: 18,
    drawerCount: 2,
    railType: "ball3stage",
    marginGap: 3,
    hasGrain: true,
  });

  const [copied, setCopied] = useState(false);
  const template = DRAWER_TEMPLATES.find(t => t.id === inputs.productType);

  // Real-time calculated result
  const result: DrawerCalcResult = useMemo(() => {
    return calculateDrawer(inputs);
  }, [inputs]);

  const totalSheetsNeeded = useMemo(() => {
    return result.sheetEstimates.reduce((sum, item) => sum + item.sheetCount, 0);
  }, [result]);

  const handleCopyClipboard = () => {
    const textLines = [
      `=== [BARON INT] 서랍장 부재 재단 및 부속/원장 산출표 ===`,
      `캐비닛 외경: ${inputs.cabinetWidth} x ${inputs.cabinetHeight} x ${inputs.cabinetDepth} mm (${inputs.boardThickness}T, ${inputs.drawerCount}단)`,
      `적용 레일: ${result.railSpec.name}`,
      result.summaryNote,
      ...(result.warnings ?? []).map(w => `확인 사항: ${w}`),
      `결 구분: ${inputs.hasGrain !== false ? "결 있음 (90° 회전 금지)" : "결 없음 (90° 회전 최적화 가능)"}`,
      ``,
      `[재단 부재 목록]`,
      `부재명\t수량\t가로(W)\t세로/깊이(D)\t두께(T)\t자재/특이사항`,
      ...result.parts.map(
        (p) =>
          `${p.name}\t${p.count}개\t${p.width}mm\t${p.depth}mm\t${p.thickness}T\t${p.material} (${p.notes})`
      ),
      ``,
      `[4×8 표준 원장(1220×2440mm) 소요량]`,
      ...result.sheetEstimates.map(
        (s) =>
          `${s.thickness}T (${s.materialName}): 총 ${s.sheetCount}장 | 순부재면적: ${s.totalPartsArea}m² | 수율: ${s.efficiency}% (로스: ${s.lossPercentage}%)`
      ),
      `>> 총 필요 4x8 원장: ${totalSheetsNeeded}장`,
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
                <h2 className="text-2xl font-bold text-slate-900">
                  서랍장 규격 계산
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  정밀 자동 계산
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                가구 치수와 판재 규격을 입력하면 재단 목록과 필요한 부자재를 계산합니다.
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
                  hasGrain: true,
                })
              }
              className="text-slate-400 hover:text-slate-600 p-1"
              title="초기화"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label htmlFor="product-type" className="block font-bold text-slate-700 mb-1.5">제작 유형 (기존 엑셀 기준)</label>
              <select id="product-type" value={inputs.productType ?? "custom"} className="w-full rounded-lg border border-slate-200 p-2" onChange={e => {
                const selected = DRAWER_TEMPLATES.find(t => t.id === e.target.value);
                if (!selected) { setInputs({ ...PRESETS[0].values, productType: "custom" }); return; }
                const count = selected.counts[0];
                const dims = templateDimensions(selected.id, count);
                setInputs({ ...inputs, productType: selected.id, cabinetWidth: selected.width, cabinetHeight: dims.height, cabinetDepth: dims.depth, drawerCount: count, boardThickness: 18, railType: "ball3stage", cabinetQuantity: inputs.cabinetQuantity ?? 1 });
              }}>
                {DRAWER_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                <option value="custom">일반 서랍 박스 계산</option>
              </select>
              <p className="mt-2 text-slate-500">엑셀 유형은 18T 몸통·15T 서랍·4.5T 우라를 적용합니다. 에보라·옴니버스는 원본 치수 확인 후 추가가 필요합니다.</p>
            </div>
            {template && <div>
              <label htmlFor="cabinet-quantity" className="block font-bold text-slate-700 mb-1.5">세대 수 / 제작 수량</label>
              <input id="cabinet-quantity" type="number" min={1} max={100} value={inputs.cabinetQuantity ?? 1} onChange={e => setInputs({ ...inputs, cabinetQuantity: Math.min(100, Math.max(1, Math.trunc(Number(e.target.value)))) })} className="w-full rounded-lg border border-slate-200 p-2" />
            </div>}
            {/* Cabinet Outer Width */}
            <div>
              <div className="flex items-center justify-between font-bold text-slate-700 mb-1">
                <label htmlFor="cabinet-width">가구 외경 가로 (Width)</label>
                <span className="text-blue-600 font-mono text-sm">{inputs.cabinetWidth} mm</span>
              </div>
              <input id="cabinet-width" aria-label="비규격 가로 mm" type="number" min={300} max={1200} step={1} value={inputs.cabinetWidth} onChange={e => setInputs({ ...inputs, cabinetWidth: Math.min(1200, Math.max(300, Number(e.target.value))) })} className="w-full rounded-lg border border-slate-200 p-2 mb-2" />
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
            {!template && <>
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
            </>}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">서랍 단수</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(template ? [...template.counts] : [1, 2, 3, 4]).map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => {
                      const dims = template ? templateDimensions(template.id, count) : null;
                      setInputs({ ...inputs, drawerCount: count, ...(dims ? { cabinetHeight: dims.height, cabinetDepth: dims.depth } : {}) });
                    }}
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
            {!template && <>
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

            {/* Grain Alignment Toggle (원장 결 방향 유무) */}
            </>}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-amber-600" />
                  원장 무늬 결 (Wood Grain)
                </span>
                <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                  4×8 배치 영향
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setInputs({ ...inputs, hasGrain: true })}
                  className={cn(
                    "p-2.5 text-left rounded-xl border transition cursor-pointer",
                    inputs.hasGrain !== false
                      ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <div className="font-bold text-xs">결 있음 (고정)</div>
                  <div className={cn("text-[10px] mt-0.5", inputs.hasGrain !== false ? "text-amber-100" : "text-slate-400")}>
                    90° 회전 금지 (결방향 보존)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setInputs({ ...inputs, hasGrain: false })}
                  className={cn(
                    "p-2.5 text-left rounded-xl border transition cursor-pointer",
                    inputs.hasGrain === false
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <div className="font-bold text-xs">결 없음 (무결)</div>
                  <div className={cn("text-[10px] mt-0.5", inputs.hasGrain === false ? "text-emerald-100" : "text-slate-400")}>
                    90° 회전 최적화 허용
                  </div>
                </button>
              </div>
            </div>

            {/* Margin gap */}
            {!template && <div>
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
            </div>}
          </div>
        </div>

        {/* Right Outputs & Visualization (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {template && <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
            <p className="font-bold text-sm">{result.summaryNote}</p>
            {(result.warnings ?? []).map(w => <p key={w} className="text-xs text-amber-800">확인 사항: {w}</p>)}
            <p className="text-xs text-slate-500">도면은 구조 참고용입니다. 상단과 하단의 정확한 재단 치수는 부재 목록을 사용해주세요.</p>
          </div>}
          <DrawerDrawing key={`${inputs.productType}-${inputs.drawerCount}-${inputs.cabinetWidth}`} result={result} />

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  부재별 자동 절단 치수표 (Cut List)
                </h3>
              </div>
              <span className="text-xs text-slate-500">{inputs.drawerCount}단 · {template ? inputs.cabinetQuantity ?? 1 : 1}세대 총 소요</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">부재 명칭</th>
                    <th className="py-3 px-4">소요 수량</th>
                    <th className="py-3 px-4">절단 규격 (가로 W × 세로 D)</th>
                    <th className="py-3 px-4">두께(T)</th>
                    <th className="py-3 px-4">엣지작업</th>
                    <th className="py-3 px-4">기타 / 가공</th>
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
                        <span className="font-medium text-slate-700">{part.edge ?? part.spec}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs whitespace-normal">{part.machining ?? part.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {template && <div className="p-4 border-t border-slate-200 bg-blue-50 text-xs text-slate-700 space-y-1">
              <p className="font-bold">제작 메모</p>
              <p>우라홈 깊이 7mm</p>
              <p>3단 볼레일 공제 25~26mm · 원본 메모: 몸통 36 / 레일 25 / 서랍판 30, 합계 91~92mm 제외</p>
              <p>서랍 내부 15T 사용 시 밑판우라 가로는 외경에서 80mm 공제 (공중형은 제품별 공제 적용)</p>
              <p>레일 {result.railSpec.length}mm × 45mm · {inputs.drawerCount * (inputs.cabinetQuantity ?? 1)}조 · 1조당 좌우 2개 세트</p>
              <p>원본 하단 메모의 ‘350mm 댐핑 2조’는 고정 문구입니다. 실제 발주 수량은 위 단수 × 제작 수량을 적용합니다.</p>
              {inputs.productType === "ceiling-floor" && <p className="text-amber-800">첨부 표의 외경 표기: {inputs.cabinetWidth} × 400 × 406 (W × D × H). 높이 406은 원본 수식 오류로 측판 높이와 맞지 않습니다. 도면은 측판 높이 + 26mm 기준이며 가구발 높이는 확인이 필요합니다.</p>}
            </div>}
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
                      {hw.count}{template ? "조" : "개"}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{hw.spec}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* NEW: 4x8 Full Sheet Calculation Card (원장 소요 장수 및 톱질 횟수 산출) */}
          <div className="bg-gradient-to-br from-amber-500/5 via-white to-amber-500/10 p-5 rounded-2xl border border-amber-200/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-200/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500 text-white shadow-xs">
                  <Grid className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <span>4×8 원장 소요 장수 & 톱질 최적화 재단 (Standard 4×8 Full Sheet)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    기본 규격 <strong>1,220mm × 2,440mm (2.98m²)</strong> 원장 기준 | 톱날 낭비 유격 <strong>4mm</strong> 반영
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-slate-600">결 설정:</span>
                <span
                  className={cn(
                    "px-2.5 py-1 rounded-full font-bold text-xs border shadow-2xs",
                    inputs.hasGrain !== false
                      ? "bg-amber-100 text-amber-900 border-amber-300"
                      : "bg-emerald-100 text-emerald-900 border-emerald-300"
                  )}
                >
                  {inputs.hasGrain !== false ? "결 있음 (회전 불가)" : "결 없음 (90° 회전배치)"}
                </span>
              </div>
            </div>

            {/* Total Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-amber-100 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 block">총 소요 원장 수량</span>
                <span className="text-2xl font-black text-amber-600 font-mono mt-0.5 block">
                  {totalSheetsNeeded} <span className="text-sm font-bold text-slate-700">장</span>
                </span>
              </div>

              {result.sheetEstimates.map((item, idx) => (
                <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500">{item.thickness}T 판재</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                      {item.materialName}
                    </span>
                  </div>
                  <span className="text-xl font-bold text-slate-900 font-mono mt-1 block">
                    {item.sheetCount} <span className="text-xs font-semibold text-slate-500">장</span>
                  </span>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                    <span>수율 {item.efficiency}%</span>
                    <span className="text-amber-700 font-semibold">톱질 {item.totalSawCuts}회</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Detailed Table per Thickness Sheet */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">두께 / 자재명</th>
                    <th className="py-2.5 px-3">부재 조각 수</th>
                    <th className="py-2.5 px-3">순 부재 면적</th>
                    <th className="py-2.5 px-3">원장 소요 수량</th>
                    <th className="py-2.5 px-3">최소 톱질 횟수 (절단)</th>
                    <th className="py-2.5 px-3">자재 수율 (Yield)</th>
                    <th className="py-2.5 px-3">스크랩/로스율</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.sheetEstimates.map((item, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/30 transition">
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {item.thickness}T <span className="font-normal text-slate-500 text-[11px]">({item.materialName})</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{item.partsCount} 조각</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{item.totalPartsArea} m²</td>
                      <td className="py-2.5 px-3 font-mono font-black text-amber-700">{item.sheetCount} 장 (4×8)</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                        총 {item.totalSawCuts}회 절단
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">{item.efficiency}%</td>
                      <td className="py-2.5 px-3 font-mono text-amber-600">{item.lossPercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* NEW: 2D Sheet Cutting Pattern Diagrams Section (원장별 2D 부재 재단 배치도) */}
            <div className="pt-4 border-t border-amber-200/60 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4.5 h-4.5 text-amber-600" />
                  <h4 className="font-bold text-sm text-slate-900">
                    원장별 2D 톱질 최소화 재단 배치도 (Minimum Saw Pass Maps)
                  </h4>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-slate-600 font-medium">18T 골조</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <span className="text-slate-600 font-medium">서랍 앞판</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-600 font-medium">15T 박스</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                    <span className="text-slate-600 font-medium">{template ? "4.5T 우라" : "9T 밑판"}</span>
                  </div>
                </div>
              </div>

              {/* Grid of 2D 4x8 Sheet Layout Maps */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {result.sheetEstimates.flatMap((item) =>
                  item.sheets.map((sheet, sIdx) => (
                    <div
                      key={`${item.thickness}-${sIdx}`}
                      className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm space-y-3 text-white"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div>
                          <div className="font-bold text-xs flex items-center gap-1.5 text-amber-400">
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px]">
                              {item.thickness}T
                            </span>
                            <span>
                              원장 #{sheet.sheetIndex} ({item.materialName})
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            배치: <strong className="text-white">{sheet.placedPieces.length}개 조각</strong>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded">
                            ✂️ 톱질 {sheet.totalSawCuts}회 (1차 {sheet.stripCount}회 + 2차 {sheet.crossCutCount}회)
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5">
                            수율 {item.efficiency}%
                          </div>
                        </div>
                      </div>

                      {/* SVG 2D Full Sheet Canvas */}
                      <div className="w-full h-80 bg-slate-950 rounded-lg p-2.5 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute top-2 left-2 text-[9px] text-slate-400 font-mono">
                          Sheet: 1220 × 2440 mm | Kerf: 4mm | 통재단 정렬
                        </div>
                        <svg
                          viewBox="0 0 1220 2440"
                          className="w-full h-full max-h-76"
                          style={{ overflow: "visible" }}
                        >
                          {/* Outer 4x8 Full Sheet Board Frame */}
                          <rect
                            x="0"
                            y="0"
                            width="1220"
                            height="2440"
                            fill="#1e293b"
                            stroke="#475569"
                            strokeWidth="14"
                            rx="16"
                          />

                          {/* Horizontal Grid Guide Lines */}
                          {Array.from({ length: 7 }).map((_, gi) => (
                            <line
                              key={gi}
                              x1="0"
                              y1={(gi + 1) * 300}
                              x2="1220"
                              y2={(gi + 1) * 300}
                              stroke="#334155"
                              strokeWidth="2"
                              strokeDasharray="12 12"
                            />
                          ))}

                          {/* Render Placed Cut Pieces */}
                          {sheet.placedPieces.map((piece, pIdx) => {
                            const isFront = piece.name.includes("앞판");
                            const isOuterFrame = item.thickness === 18 && !isFront;
                            const isBox = item.thickness === 15 && !isFront;

                            const fillColor = isFront
                              ? "#3b82f6"
                              : isOuterFrame
                              ? "#f59e0b"
                              : isBox
                              ? "#10b981"
                              : "#8b5cf6";

                            return (
                              <g key={pIdx}>
                                <rect
                                  x={piece.x + 3}
                                  y={piece.y + 3}
                                  width={Math.max(10, piece.pw - 6)}
                                  height={Math.max(10, piece.ph - 6)}
                                  fill={fillColor}
                                  fillOpacity="0.88"
                                  stroke="#ffffff"
                                  strokeWidth="6"
                                  rx="10"
                                />
                                {piece.ph > 90 && (
                                  <text
                                    x={piece.x + piece.pw / 2}
                                    y={piece.y + piece.ph / 2 - 12}
                                    fill="#ffffff"
                                    fontSize={piece.ph > 200 ? "36" : "26"}
                                    fontWeight="900"
                                    textAnchor="middle"
                                  >
                                    {piece.name}
                                  </text>
                                )}
                                {piece.ph > 140 && (
                                  <text
                                    x={piece.x + piece.pw / 2}
                                    y={piece.y + piece.ph / 2 + 26}
                                    fill="#f8fafc"
                                    fontSize={piece.ph > 200 ? "30" : "22"}
                                    fontWeight="bold"
                                    textAnchor="middle"
                                  >
                                    {piece.width} × {piece.depth}mm {piece.rotated ? "(🔄90°)" : ""}
                                  </text>
                                )}
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
              <Maximize2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>
                <strong>톱질 최소화 통재단 가이드:</strong> 높이(Depth/Height)가 같은 부재를 1차 일직선 띠 재단(Strip Cut)으로 묶어 재단 횟수를 최대로 줄였습니다. 판재 톱 작업 시 1차 띠 재단 후 2차 부재 분할 재단이 순차 진행됩니다.
              </span>
            </p>
          </div>

          {/* Cutting List Table (재단 치수표) */}

        </div>
      </div>
    </div>
  );
}

