export const SHIPPING_MODES = ["택배 선불", "택배 착불", "화물 선불", "화물 착불"] as const;
export type ShippingMode = typeof SHIPPING_MODES[number];
export type Sender = "baron" | "homepartner";
export interface Shipment {
  id: string; sender: Sender; customer: string; recipient: string; phone: string;
  address: string; mode: ShippingMode | ""; product: string; quantity: number | null;
  packaging: string; freight: string; note: string; source: string;
}
export interface ShippingBatch { id: string; date: string; sourceName: string; entries: Shipment[] }
export interface ShippingHistory { id: string; date: string; sourceName: string; count: number; baronCount: number; homepartnerCount: number; author: string; createdAt: string }
export const SENDERS = {
  baron: { name: "바론아이엔티㈜", address: "경기 포천시 가산면 오성길 89-7 바론아이엔티", phone: "031-902-2588", fax: "031-902-2589" },
  homepartner: { name: "홈파트너", address: "경기도 의정부시 민락동 803-2 중흥 E동 708호", phone: "070-7543-2581", fax: "031-902-2589" },
};
export const CARRIER = { name: "대신택배 포천가산점", address: "경기 포천시 가산면 마산리 322-4", phone: "070-4313-8268 / 031-544-5199", fax: "031-544-7199" };

export function validShippingDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
}
export function classifyShipping(note: string): ShippingMode | "" | null {
  const text=note.replace(/\s/g, "");
  const modes: ShippingMode[]=[];
  if (/(?:선불택배|택배선불)|(?:대신|(?<![가-힣]))선택(?=[^가-힣]|$)/.test(text)) modes.push("택배 선불");
  if (/(?:착불택배|택배착불|후불택배|택배후불)|(?:대신|(?<![가-힣]))착택(?=[^가-힣]|$)/.test(text)) modes.push("택배 착불");
  if (/(?:선불화물|화물선불)|(?:대신|(?<![가-힣]))선화(?=[^가-힣]|$)/.test(text)) modes.push("화물 선불");
  if (/(?:착불화물|화물착불|후불화물|화물후불)|(?:대신|(?<![가-힣]))착화(?=[^가-힣]|$)/.test(text)) modes.push("화물 착불");
  if (modes.length === 1) return modes[0];
  if (modes.length > 1 || /대신(?:택배|화물|착불|선불)/.test(text)) return "";
  return null;
}
const transport=/(?:대신\s*)?(?:선불택배|택배선불|착불택배|택배착불|선불화물|화물선불|착불화물|화물착불|후불택배|택배후불|후불화물|화물후불)|(?:대신|(?<![가-힣]))(?:선택|착택|선화|착화)(?=[^가-힣]|$)|대신(?:택배|화물)/g;
export function extractRecipient(note: string, customer: string) {
  const phones=[...note.matchAll(/(?:0(?:1[016789]|2|[3-6][1-5]|70|50[2-8]))[- .]?\d{3,4}[- .]?\d{4}/g)];
  const last=phones.at(-1);const raw=last?.[0] || "";
  const digits=raw.replace(/\D/g,"");
  const phone=digits ? digits.replace(/^(02|050[2-8]|0\d{2})(\d{3,4})(\d{4})$/,"$1-$2-$3") : "";
  const body=(last ? note.slice(0,last.index) : note).replace(/^\s*\([^)]*\)\s*/,"").replace(transport,"");
  const parts=body.split(/[\/\n]+/).map(v=>v.trim()).filter(Boolean);
  const isAddress=(v:string)=> /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충[남북청]|전[남북라]|경[남북상]|제주|[가-힣]+(?:시|군|구)\s|(?:읍|면|동|로|길)\s*\d|(?:지점|점)$)/.test(v);
  const addressIndex=parts.findIndex(isAddress);
  let recipient="",address="";
  if(addressIndex>=0){
    const preceding=parts.slice(0,addressIndex).filter(v=>v.length<=40&&!/출고|보드|강과장|택배|화물/.test(v));
    recipient=preceding.at(-1)||"";
    const tail=parts.slice(addressIndex);
    const trailing=tail.at(-1)||"";
    if(tail.length>1 && !isAddress(trailing) && !/문앞|경비실|부재|배송|사무실|부탁|연락|놓아/.test(trailing) && trailing.length<=30){
      recipient=recipient||tail.pop()!;
    }
    address=tail.join(" / ");
    if(!recipient){
      const business=address.match(/\s+([가-힣A-Za-z0-9㈜()]+(?:주방가구|퍼니처|씽크|싱크|가구|산업|디자인))\s*$/);
      if(business){recipient=business[1];address=address.slice(0,business.index).trim();}
    }
  } else {
    recipient=parts.find(v=>v.length<=30&&!/출고|보드|강과장|택배|화물/.test(v))||"";
  }
  return {recipient:recipient||customer.replace(/\([^)]*\)/g,"").trim(),address,phone};
}
export function shipmentWarnings(entry: Shipment) {
  const warnings:string[]=[];
  if(!entry.mode)warnings.push("운송구분 확인");
  if(!entry.recipient.trim())warnings.push("받는 분 없음");
  if(!entry.address.trim())warnings.push("주소 없음");
  if(!entry.phone.trim())warnings.push("전화번호 없음");
  if(!entry.product.trim())warnings.push("품명 없음");
  if(entry.quantity===null)warnings.push("수량 없음");
  return warnings;
}
export function parseShippingRows(rows: unknown[][], sheetName: string) {
  const normalize=(v:unknown)=>String(v??"").replace(/\s/g,"");
  const headerIndex=rows.findIndex(row=>row.some(c=>normalize(c)==="적요") && row.some(c=>["장부명","거래처","업체명"].includes(normalize(c))));
  if(headerIndex<0)return null;
  const headers=rows[headerIndex].map(normalize);
  const column=(names:string[])=>headers.findIndex(h=>names.includes(h));
  const customerCol=column(["장부명","거래처","업체명"]),noteCol=column(["적요"]),kindCol=column(["구분"]);
  const productCol=column(["품명","상품명","제품명"]),quantityCol=column(["박스수량","포장수량","수량"]);
  const entries:Shipment[]=[],excluded:{source:string;customer:string;note:string;reason:string}[]=[];
  for(let i=headerIndex+1;i<rows.length;i++){
    const row=rows[i];if(!row.some(v=>String(v??"").trim()))continue;
    const value=(c:number)=>String(row[c]??"").trim();
    const customer=value(customerCol),note=value(noteCol),source=`${sheetName} ${i+1}행`,mode=classifyShipping(note);
    if((kindCol>=0&&value(kindCol)&&value(kindCol)!=="출고") || mode===null || /(?:택배|화물)\s*(?:취소|아님)|발송\s*취소/.test(note)){
      excluded.push({source,customer,note,reason:mode===null?"운송 표시 없음":"출고 대상 아님 / 취소"});continue;
    }
    const qty=quantityCol<0||!value(quantityCol)?null:Number(value(quantityCol).replace(/,/g,""));
    entries.push({id:`${sheetName}:${i+1}`,sender:customer.replace(/\s/g,"").includes("홈파트너")?"homepartner":"baron",customer,...extractRecipient(note,customer),mode,
      product:productCol<0?"":value(productCol),quantity:qty!==null&&Number.isSafeInteger(qty)&&qty>0?qty:null,packaging:"양호",freight:"",note,source});
  }
  return {entries,excluded};
}
export function validateShippingBatch(value: unknown): ShippingBatch {
  if(!value||typeof value!=="object")throw new Error("송장 데이터를 확인해 주세요.");
  const b=value as Record<string,unknown>;
  const text=(v:unknown,max:number)=>{if(typeof v!=="string"||v.length>max)throw new Error("송장 항목 형식 또는 길이를 확인해 주세요.");return v.trim();};
  const id=text(b.id,80),date=text(b.date,10),sourceName=text(b.sourceName,255);
  if(!/^[0-9a-f-]{36}$/i.test(id)||!validShippingDate(date)||!sourceName)throw new Error("저장 번호, 발송일 또는 원본 파일명을 확인해 주세요.");
  if(!Array.isArray(b.entries)||!b.entries.length||b.entries.length>1000)throw new Error("송장은 1~1,000건까지 저장할 수 있습니다.");
  const ids=new Set<string>();
  const entries=b.entries.map((item:unknown)=>{
    if(!item||typeof item!=="object")throw new Error("송장 항목을 확인해 주세요.");
    const e=item as Record<string,unknown>;
    if(e.sender!=="baron"&&e.sender!=="homepartner")throw new Error("발송 업체를 선택해 주세요.");
    if(!SHIPPING_MODES.includes(e.mode as ShippingMode))throw new Error("택배·화물의 선불·착불을 선택해 주세요.");
    if(e.quantity!==null&&(!Number.isSafeInteger(e.quantity)||Number(e.quantity)<=0||Number(e.quantity)>99999))throw new Error("수량은 빈칸 또는 1~99,999의 정수로 입력해 주세요.");
    const result:Shipment={id:text(e.id,200),sender:e.sender,mode:e.mode as ShippingMode,customer:text(e.customer,200),recipient:text(e.recipient,200),phone:text(e.phone,60),address:text(e.address,1000),product:text(e.product,300),quantity:e.quantity as number|null,packaging:text(e.packaging,100),freight:text(e.freight,100),note:text(e.note,5000),source:text(e.source,200)};
    if(!result.id||ids.has(result.id))throw new Error("중복된 송장 항목이 있습니다.");ids.add(result.id);
    if(!result.recipient||!result.address||!result.phone)throw new Error("받는 분·주소·전화번호를 확인해 주세요.");
    return result;
  });
  return {id,date,sourceName,entries};
}
