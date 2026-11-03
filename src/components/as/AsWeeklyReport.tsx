import { asReceivedDate, asReportSummary, type AsReport } from "@/lib/as-report";
import styles from "./as-report.module.css";

const value = (text?: string) => text?.trim() || "—";
const date = (text: string) => text.replaceAll("-", ".");

export function AsWeeklyReport({ report, generatedAt }: { report: AsReport; generatedAt: string }) {
  const generated = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(new Date(generatedAt));
  return <div className={styles.report}>
    {report.weeks.length === 0 && <p className={styles.empty}>선택 기간에 월요일~토요일이 없습니다.</p>}
    {report.weeks.map((week, index) => {
      const counts = asReportSummary(week.items);
      return <section className={styles.week} key={week.start}>
        <header className={styles.heading}>
          <div><p className={styles.brand}>BALON</p><h2>A/S 주간 보고서</h2><p className={styles.weekDate}>{date(week.start)} (월) ~ {date(week.end)} (토)</p></div>
          <div className={styles.meta}><p>조회 기간 {date(report.start)} ~ {date(report.end)}</p><p>보고서 {index + 1} / {report.weeks.length}주 · 전체 {report.summary.total}건</p><p>조회 시각 {generated} (한국 시간)</p></div>
        </header>
        <p className={styles.basis}>접수일 기준 · 상태와 조치 내용은 조회 시점 기준{(week.from !== week.start || week.to !== week.end) && ` · 이번 주 집계 범위 ${date(week.from)} ~ ${date(week.to)}`}</p>
        <div className={styles.summary}><span>접수 총계 <b>{counts.total}건</b></span><span>접수 <b>{counts.received}건</b></span><span>처리중 <b>{counts.processing}건</b></span><span>완료 <b>{counts.completed}건</b></span><span>긴급 <b>{counts.urgent}건</b></span></div>
        <table className={styles.table}>
          <caption className={styles.caption}>{date(week.start)} 주간 A/S 접수 및 조치 내역</caption>
          <colgroup>{[4, 10, 11, 18, 20, 19, 9, 9].map((width, i) => <col key={i} style={{ width: `${width}%` }} />)}</colgroup>
          <thead><tr><th scope="col">번호</th><th scope="col">접수일<br />처리 예정일</th><th scope="col">업체명<br />최초 시공</th><th scope="col">현장 주소 · 연락처</th><th scope="col">A/S 발생 사유</th><th scope="col">처리 내용 · 조치 결과</th><th scope="col">상태<br />유·무상</th><th scope="col">담당기사<br />우선순위</th></tr></thead>
          <tbody>{week.items.length === 0 ? <tr><td colSpan={8} className={styles.empty}>해당 기간에 접수된 A/S가 없습니다.</td></tr> : week.items.map((item, row) => <tr key={item.id}>
            <td className={styles.center}>{row + 1}</td>
            <td className={styles.center}><span>{asReceivedDate(item)}</span><small>{value(item.asDate)}</small></td>
            <td><strong>{value(item.clientName)}</strong><small>{value(item.constructDate)}<br />{value(item.installer)}</small></td>
            <td>{value(item.siteAddress)}<small>{value(item.contactPhone)}</small></td>
            <td>{value(item.reason)}</td><td>{value(item.resolutionDetails)}</td>
            <td className={styles.center}><strong>{value(item.resultStatus)}</strong><small>{value(item.serviceType)}{item.serviceType === "유상" && item.paidReason && <><br />{item.paidReason}</>}</small></td>
            <td className={styles.center}>{value(item.technician)}<small>{value(item.priority)}</small></td>
          </tr>)}</tbody>
        </table>
        <footer className={styles.footer}>월요일~토요일 접수 기록을 집계합니다. 선택 기간의 일요일 기록 {report.excludedSundays}건 제외.{report.undated > 0 && ` 전체 조회 기록 중 접수일 확인 불가 ${report.undated}건 제외.`}</footer>
      </section>;
    })}
  </div>;
}
