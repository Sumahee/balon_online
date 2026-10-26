import { CARRIER, SENDERS, SHIPPING_MODES, type Sender, type ShippingBatch } from "@/lib/shipping";
import styles from "@/app/shipping/shipping.module.css";

export function InvoiceSheets({batch,filter="all"}:{batch:ShippingBatch;filter?:Sender|"all"}){
  return <div className={styles.invoices}>{(["baron","homepartner"] as const).filter(s=>filter==="all"||filter===s).flatMap(sender=>{
    const entries=batch.entries.filter(e=>e.sender===sender),company=SENDERS[sender];
    return Array.from({length:Math.ceil(entries.length/13)},(_,page)=>{
      const group=entries.slice(page*13,page*13+13);
      return <article key={sender+page} className={styles.sheet}>
        <h2>대신택배 발송접수증</h2>
        <div className={styles.companies}><div><b>{company.name}</b><p>{company.address}</p><p>전화번호: {company.phone}　F: {company.fax}</p></div><div><b>{CARRIER.name}</b><p>{CARRIER.address}</p><p>{CARRIER.phone}　F: {CARRIER.fax}</p></div></div>
        <p className={styles.date}>{batch.date}　{page+1} / {Math.ceil(entries.length/13)}</p>
        <table className={styles.invoiceTable}><colgroup><col style={{width:"12%"}}/><col style={{width:"12%"}}/><col style={{width:"31%"}}/><col style={{width:"11%"}}/><col style={{width:"5%"}}/><col style={{width:"4%"}}/>{SHIPPING_MODES.map(m=><col key={m} style={{width:"5%"}}/>)}<col style={{width:"5%"}}/></colgroup>
          <thead><tr><th rowSpan={2}>수화주전화</th><th rowSpan={2}>수화주명</th><th rowSpan={2}>수화주 주소</th><th rowSpan={2}>품명</th><th rowSpan={2}>포장<br/>상태</th><th rowSpan={2}>수량</th><th colSpan={4}>제품구분</th><th rowSpan={2}>운임비</th></tr><tr>{SHIPPING_MODES.map(m=><th key={m}>{m}</th>)}</tr></thead>
          <tbody>{group.map(e=><tr key={e.id}><td>{e.phone}</td><td>{e.recipient}</td><td>{e.address}</td><td>{e.product}</td><td>{e.packaging}</td><td>{e.quantity??""}</td>{SHIPPING_MODES.map(m=><td key={m}><span className={m===e.mode?styles.circled:styles.mode}>{m.split(" ").map((word,i)=><span key={i}>{word}</span>)}</span></td>)}<td>{e.freight}</td></tr>)}</tbody>
        </table>
      </article>;
    });
  })}</div>;
}
