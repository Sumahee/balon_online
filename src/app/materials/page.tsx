"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Search, Move, Plus, X } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { plywoodSource, type PlywoodSample } from "@/lib/plywood-catalog";
import { requestApi } from "@/lib/api-client";
import { PlywoodRegistration } from "@/components/materials/PlywoodRegistration";
import styles from "./materials.module.css";

export default function MaterialsPage() {
  const [selectedId, setSelectedId] = useState("balon-08");
  const [manual, setManual] = useState<PlywoodSample[]>([]);
  const [editingSample, setEditingSample] = useState<PlywoodSample | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadVersion, setLoadVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    requestApi<PlywoodSample[]>("/api/plywoods").then((result) => { if (active) { setManual(result.data || []); setLoadError(""); } }).catch((error) => { if (active) setLoadError(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadVersion]);
  const catalog = manual;
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("전체");
  const [angle, setAngle] = useState({ x: -7, y: -14 });
  const sample = catalog.find((item) => item.id === selectedId) || catalog[0];
  const filtered = catalog.filter((item) => (filter !== "텍스처" || item.image) && (filter !== "단색" || !item.image) && `${item.name} ${item.code}`.toLowerCase().includes(query.trim().toLowerCase()));
  const comparing = compareIds.length > 0;
  const previewSamples = comparing ? compareIds.map((id) => catalog.find((item) => item.id === id)!).filter(Boolean) : sample ? [sample] : [];
  const toggleCompare = (id: string) => setCompareIds((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : ids.length < 2 ? [...ids, id] : ids);
  const boardStyle = (item: PlywoodSample) => ({
    backgroundColor: item.color, backgroundImage: item.image ? `url("${item.image}")` : undefined,
    "--rx": `${angle.x}deg`, "--ry": `${angle.y}deg`,
    "--shine-x": `${50 + angle.y * 2}%`, "--shine-y": `${35 - angle.x * 2}%`,
    "--shine-opacity": .1 + (1 - item.roughness) * .25,
  } as CSSProperties);

  return (
    <div className="space-y-4">
      <PageHeader title="합판 컬러 라이브러리" description="목록에서 합판을 선택하면 옆에서 크게 확인할 수 있습니다." actions={<button type="button" className="action-primary" onClick={() => setRegisterOpen(true)}><Plus size={16} /> 합판 등록</button>} />
      {loadError && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{loadError} <button type="button" className="underline" onClick={() => setLoadVersion((value) => value + 1)}>다시 불러오기</button></p>}
      {registerOpen && <PlywoodRegistration onClose={() => setRegisterOpen(false)} onSaved={(item) => { setManual((items) => [item, ...items]); setSelectedId(item.id); setFilter("전체"); setQuery(""); setRegisterOpen(false); }} />}
      {editingSample && <PlywoodRegistration key={editingSample.id} sample={editingSample} onClose={() => setEditingSample(null)} onSaved={(item) => { setManual((items) => [item, ...items.filter((existing) => existing.id !== item.id)]); setEditingSample(null); }} />}
      <div className={styles.workspace}>
        <section className={styles.library} aria-label="합판 목록">
          <div className={styles.listHeader}>
            <h2>합판 <span>{filtered.length}</span></h2>
            <label className={styles.search}><Search size={15} /><input aria-label="합판 이름·품번 검색" placeholder="이름·품번 검색" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            <div className={styles.filters}>{["전체", "텍스처", "단색"].map((value) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}</div>
          </div>
          <p className={styles.compareHint} aria-live="polite">체크해서 2개 비교 · {compareIds.length}/2 선택</p>
          <div className={styles.collection}>
            {filtered.map((item) => <div key={item.id} className={styles.sampleRow}><button type="button" aria-pressed={selectedId === item.id} className={styles.sample} onClick={() => { setCompareIds([]); setSelectedId(item.id); setAngle({ x: -7, y: -14 }); }}>
              <span className={styles.thumbnail} style={{ backgroundColor: item.color, backgroundImage: item.image ? `url("${item.image}")` : undefined }} />
              <span className={styles.sampleInfo}><span className={styles.sampleName}>{item.name}</span><span className={styles.sampleCode}>{item.code}{item.origin === "manual" ? " · 수동 등록" : ""}</span></span>
            </button>
              <label className={styles.compareCheck} title={compareIds.length === 2 && !compareIds.includes(item.id) ? "선택한 합판을 해제하면 다른 합판을 비교할 수 있습니다." : "비교할 합판 선택"}>
                <input type="checkbox" aria-label={`${item.name} ${item.code} 비교 선택`} checked={compareIds.includes(item.id)} disabled={compareIds.length === 2 && !compareIds.includes(item.id)} onChange={() => toggleCompare(item.id)} />
              </label>
            </div>)}
            {!filtered.length && <p className="p-4 text-sm text-slate-500">{loading ? "DB에서 합판을 불러오는 중…" : loadError ? "합판 조회에 실패했습니다." : "검색한 합판이 없습니다."}</p>}
          </div>
        </section>
        <section className={styles.preview} aria-label="선택한 합판 미리보기">
          {comparing && <div className={styles.compareBar}><span>합판 비교 · {compareIds.length}/2</span><button type="button" onClick={() => setCompareIds([])}>비교 닫기 <X size={14} /></button></div>}
          <div className={`${styles.previewPanels} ${comparing ? styles.comparing : ""}`} onPointerMove={(event) => {
            if (event.pointerType === "touch") return;
            const rect = event.currentTarget.getBoundingClientRect();
            setAngle({ x: -7 - ((event.clientY - rect.top) / rect.height - .5) * 14, y: ((event.clientX - rect.left) / rect.width - .5) * 30 });
          }} onPointerLeave={() => setAngle({ x: -7, y: -14 })}>
            {!previewSamples.length && <p className="self-center p-8 text-center text-sm text-slate-500">{loading ? "합판을 불러오는 중…" : "목록에서 합판을 선택해 주세요."}</p>}
            {previewSamples.map((item) => <div className={styles.previewPanel} key={item.id}>
              <div className={styles.previewHeader} aria-live="polite"><h2>{item.name}</h2><p>품번 <strong>{item.code}</strong>{item.image ? "" : " · 색상 샘플"}</p><button type="button" className={styles.editImage} aria-label={`${item.name} ${item.code} 이미지 수정`} onClick={() => setEditingSample(item)}>이미지 수정</button>{comparing && <button type="button" className={styles.removeComparison} aria-label={`${item.name} 비교 해제`} onClick={() => toggleCompare(item.id)}><X size={14} /></button>}</div>
              <div className={styles.scene}><div className={styles.board} style={boardStyle(item)} role="img" aria-label={`${item.name} ${item.code} 판재 미리보기`}><div className={styles.reflection} /></div></div>
            </div>)}
            {comparing && previewSamples.length === 1 && <div className={styles.emptyComparison}><Plus size={22} /><p>비교할 합판을<br />하나 더 체크해 주세요</p></div>}
          </div>
          <div className={styles.previewFooter}><span><Move size={14} /> 마우스로 표면 살펴보기</span><span>화면 색상은 실물과 다를 수 있습니다.</span></div>
        </section>
      </div>
      <p className="text-xs text-slate-500">출처: <a className="underline" href={plywoodSource} target="_blank" rel="noreferrer">BALON 공식 합판 목록</a> · 공식 샘플 30종 · 원본 품번 표기 기준</p>
    </div>
  );
}
