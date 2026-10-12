"use client";

import { useState } from "react";
import type { DrawerCalcResult } from "@/types";

export default function DrawerDrawing({ result }: { result: DrawerCalcResult }) {
  const { input, parts } = result;
  const [railTop, setRailTop] = useState<Record<number, string>>({});
  const [frontOffset, setFrontOffset] = useState("");
  const [holeOffsets, setHoleOffsets] = useState("");
  const [diameter, setDiameter] = useState("");
  const W = input.cabinetWidth, H = input.cabinetHeight, D = input.cabinetDepth;
  const scale = Math.min(460 / W, 300 / D, 550 / H);
  const fw = W * scale, sh = H * scale, sd = D * scale, t = input.boardThickness * scale;
  const x = 70, y = 70, sx = x + fw + 140;
  const vbW = sx + sd + 110, vbH = sh + 190;
  const doors = parts.filter(p => p.name.includes("도어") || p.name.includes("전면 앞판"));
  const faces = doors.flatMap(p => Array.from({ length: p.count / (input.cabinetQuantity ?? 1) }, () => p)).slice(0, input.drawerCount);
  const island = input.productType?.startsWith("island");
  const channel = input.productType === "island-channel";
  const floor = input.productType === "ceiling-floor";
  const faceStart = y + t + (island ? 60 * scale : 2 * scale);
  const gap = (island ? (channel ? 25 : 4) : 4) * scale;
  const faceY = (i: number) => faceStart + faces.slice(0, i).reduce((sum, p) => sum + p.depth * scale + gap, 0);
  const sidePart = parts.find(p => p.name === "측판");
  const sideHeight = sidePart ? Math.max(sidePart.width, sidePart.depth) : H - input.boardThickness * 2;
  const sideDepth = sidePart ? Math.min(sidePart.width, sidePart.depth) : D;
  const backThickness = parts.find(p=>p.name === "뒤판" || p.name === "뒤판우라")?.thickness ?? input.boardThickness;
  const holeValues = holeOffsets.split(/[,\s]+/).filter(Boolean).map(Number);
  const holesValid = holeValues.length > 0 && holeValues.every(v => Number.isFinite(v) && v >= 0 && v <= result.railSpec.length);
  const offsetValid = frontOffset.trim() !== "" && Number(frontOffset) >= 0 && Number(frontOffset) + result.railSpec.length <= sideDepth;
  const diameterValid = diameter.trim() !== "" && Number(diameter) > 0 && Number(diameter) <= 20;
  const dim = (x1: number, y1: number, x2: number, y2: number, label: string) => <g stroke="#64748b" strokeWidth="1"><line x1={x1} y1={y1} x2={x2} y2={y2} /><path d={`M${x1-4},${y1-4}l8,8 M${x2-4},${y2-4}l8,8`} /><text x={(x1+x2)/2} y={(y1+y2)/2-8} fill="#334155" stroke="none" textAnchor="middle" fontSize="12">{label}</text></g>;
  return <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
    <div><h3 className="font-bold text-slate-900">제작 도면 · 정면 / 측면</h3><p className="text-xs text-slate-500 mt-1">동일 축척으로 실제 재단 치수 비율을 표시합니다. 단위 mm. 조립 간격·손잡이·가구발은 배치 예시입니다.</p></div>
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50">
      <svg role="img" aria-label="서랍장 정면도와 측면 레일 타공 가이드" viewBox={`0 0 ${vbW} ${vbH}`} className="w-full min-w-[700px]" style={{ maxHeight: 720 }}>
        <defs><pattern id="drawer-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#cbd5e1" strokeWidth="2" /></pattern></defs>
        <text x={x+fw/2} y="24" textAnchor="middle" fontSize="15" fontWeight="bold" fill="#0f172a">정면도</text>
        <text x={sx+sd/2} y="24" textAnchor="middle" fontSize="15" fontWeight="bold" fill="#0f172a">측면 투시도 · 앞 → 뒤</text>
        {dim(x,y-18,x+fw,y-18,`가로 ${W}`)}
        {dim(sx,y-18,sx+sd,y-18,`깊이 ${D}`)}
        <rect x={x} y={y} width={fw} height={sh} fill="url(#drawer-hatch)" stroke="#475569" />
        <rect x={x} y={y} width={fw} height={t} fill="#e2e8f0" stroke="#475569" />
        <rect x={sx} y={y} width={sd} height={t} fill="#e2e8f0" stroke="#475569" />
        <rect x={sx+t} y={y+t} width={sideDepth*scale} height={sideHeight*scale} fill="#f1f5f9" stroke="#94a3b8" />
        <text x={sx+sd/2} y={y+sh+30} textAnchor="middle" fontSize="11" fill="#64748b">측판 {sideDepth} × {sideHeight} · {input.boardThickness}T</text>
        <rect x={sx+sd-(backThickness+4.5)*scale} y={y+t} width={backThickness*scale} height={Math.min(sideHeight,H-input.boardThickness)*scale} fill="#cbd5e1" stroke="#94a3b8" strokeDasharray="3 2" />
        {floor && <g fill="#64748b"><rect x={x+35*scale} y={y+sh-8*scale} width={30*scale} height={8*scale} /><rect x={x+fw-65*scale} y={y+sh-8*scale} width={30*scale} height={8*scale} /><rect x={sx+35*scale} y={y+sh-8*scale} width={30*scale} height={8*scale} /><rect x={sx+sd-65*scale} y={y+sh-8*scale} width={30*scale} height={8*scale} /></g>}
        {faces.map((p,i) => {
          const dy = faceY(i), dh = p.depth*scale, dw = p.width*scale;
          const boxSide = parts.find(p => p.name.includes("좌우측판") && (i === 0 ? !p.name.includes("2,3,4") : !p.name.includes("상단")));
          const bh = (boxSide?.depth ?? result.boxDimensions.height)*scale;
          const entered = railTop[i]?.trim();
          const topValid = !!entered && Number(entered) >= 22.5 && Number(entered) <= sideHeight-22.5;
          const confirmed = topValid && offsetValid;
          const ry = topValid ? y+t+Number(entered)*scale : dy+dh*.58;
          const rx = sx+t+(offsetValid ? Number(frontOffset) : 10)*scale;
          const rw = result.railSpec.length*scale;
          const holes = holesValid ? holeValues : [result.railSpec.length*.12,result.railSpec.length*.5,result.railSpec.length*.88];
          return <g key={i}>
            <rect x={x+(fw-dw)/2} y={dy} width={dw} height={dh} fill="#fff" stroke="#475569" />
            {!channel && <rect x={x+fw/2-22} y={dy+Math.min(dh*.3,16)} width="44" height="4" rx="2" fill="#64748b" />}
            <text x={x+fw/2} y={dy+dh*.65} textAnchor="middle" fontSize="12" fill="#334155">{i+1}단 도어 {p.width} × {p.depth}</text>
            <rect x={sx} y={dy} width={t} height={dh} fill="#fff" stroke="#475569" />
            <rect x={rx} y={dy+(dh-bh)/2} width={rw} height={bh} fill="#dbeafe" fillOpacity=".55" stroke="#94a3b8" strokeDasharray="4 3" />
            <rect x={rx} y={ry-22.5*scale} width={rw} height={45*scale} fill={confirmed ? "#fde68a" : "#fef3c7"} stroke="#d97706" strokeDasharray={confirmed ? undefined : "5 3"} />
            <line x1={rx} y1={ry} x2={rx+rw} y2={ry} stroke="#d97706" strokeDasharray="6 3" />
            {holes.map((h,j) => <g key={j} stroke="#dc2626"><circle cx={rx+h*scale} cy={ry} r={diameterValid ? Math.max(2,Number(diameter)*scale/2) : 3} fill="#fff" /><path d={`M${rx+h*scale-5},${ry}h10 M${rx+h*scale},${ry-5}v10`} /></g>)}
            <text x={rx+rw/2} y={ry+22.5*scale+14} textAnchor="middle" fontSize="10" fill="#92400e">{i+1}단 레일 {result.railSpec.length} · {confirmed ? `상단 기준 ${entered}` : "위치 미확정 (예시)"}</text>
          </g>;
        })}
        {floor && <g><rect x={x+t} y={y+sh-65*scale} width={fw-2*t} height={55*scale} fill="#e2e8f0" stroke="#64748b" /><text x={x+fw/2} y={y+sh-30*scale} textAnchor="middle" fontSize="10" fill="#475569">걸레받이 55</text></g>}
        <line x1={x-22} y1={y} x2={x-22} y2={y+sh} stroke="#64748b" /><text transform={`translate(${x-32},${y+sh/2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="#334155">외경 높이 {H} (가구발 포함 여부 확인)</text>
        <text x={x} y={vbH-45} fontSize="12" fill="#dc2626">＋ 가이드 타공 · 주황색 레일 중심선 · 점선은 배치 예시</text>
        <text x={x} y={vbH-23} fontSize="11" fill="#64748b">우라홈 깊이 7mm · 홈 위치 / 손잡이 타공 / 가구발 위치 미확정</text>
      </svg>
    </div>
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs space-y-2">
      <p className="font-bold text-amber-900">레일 / 가이드 타공 위치 입력</p>
      <p className="text-amber-800">정확한 위치를 받으면 입력할 수 있습니다. 세로 기준은 몸통 측판 상단 → 레일 중심, 가로 기준은 측판 앞끝 → 레일 앞끝입니다. 빈 항목은 예시로 표시됩니다.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({length:input.drawerCount},(_,i) => <label key={i}>{i+1}단 중심 높이 (상단 기준)<input aria-label={`${i+1}단 레일 중심 높이`} type="number" min={22.5} max={sideHeight-22.5} value={railTop[i] ?? ""} placeholder="미확정" onChange={e=>setRailTop({...railTop,[i]:e.target.value})} className="mt-1 w-full p-2 border rounded bg-white" /></label>)}
        <label>레일 앞끝 거리<input type="number" min={0} max={sideDepth-result.railSpec.length} value={frontOffset} placeholder="미확정" onChange={e=>setFrontOffset(e.target.value)} className="mt-1 w-full p-2 border rounded bg-white" /></label>
        <label>타공 지름 Ø<input type="number" min={0.1} max={20} value={diameter} placeholder="미확정" onChange={e=>setDiameter(e.target.value)} className="mt-1 w-full p-2 border rounded bg-white" /></label>
        <label className="col-span-2">타공 거리 (레일 앞끝 기준, 쉼표로 구분)<input value={holeOffsets} placeholder="미확정" onChange={e=>setHoleOffsets(e.target.value)} className="mt-1 w-full p-2 border rounded bg-white" /></label>
      </div>
      <p className="text-amber-900">{holesValid && diameterValid ? `타공: ${holeValues.join(", ")}mm / Ø${diameter}mm` : "타공 간격과 지름 미확정 — 표시된 구멍은 위치 예시입니다."}</p>
      {(frontOffset && !offsetValid || holeOffsets && !holesValid || diameter && !diameterValid || Object.values(railTop).some(v=>v!=="" && (Number(v)<22.5 || Number(v)>sideHeight-22.5))) && <p className="text-red-700">입력 범위를 확인해주세요. 레일은 측판 안에, 타공은 레일 길이 안에 있어야 합니다.</p>}
    </div>
  </section>;
}
