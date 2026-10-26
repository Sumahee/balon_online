import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";
import { SHIPPING_MODES, type ShippingBatch, type Sender } from "./shipping";

const REL="http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const DRAW="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing";
const ART="http://schemas.openxmlformats.org/drawingml/2006/main";
const xml=(value:unknown)=>String(value??"").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
const cell=(address:string,value:unknown,style:string)=>value===null||value===""?`<c r="${address}" s="${style}"/>`:typeof value==="number"?`<c r="${address}" s="${style}"><v>${value}</v></c>`:`<c r="${address}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
function circles(modes:string[]){
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="${DRAW}" xmlns:a="${ART}">${modes.map((mode,i)=>{
    const col=6+SHIPPING_MODES.indexOf(mode as typeof SHIPPING_MODES[number]),row=7+i*2;
    return `<xdr:oneCellAnchor><xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>76200</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>28575</xdr:rowOff></xdr:from><xdr:ext cx="457200" cy="495300"/><xdr:sp><xdr:nvSpPr><xdr:cNvPr id="${i+1}" name="운송구분 ${i+1}"/><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="457200" cy="495300"/></a:xfrm><a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom><a:noFill/><a:ln w="25400"><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:prstDash val="solid"/></a:ln></xdr:spPr></xdr:sp><xdr:clientData/></xdr:oneCellAnchor>`;
  }).join("")}</xdr:wsDr>`;
}
/** Keep Excel's original template parts and schema order, including native circles. */
export function makeShippingExcel(template:Uint8Array,batch:ShippingBatch,sender:Sender):Uint8Array {
  const entries=batch.entries.filter(e=>e.sender===sender);
  if(!entries.length)throw new Error("이 업체의 송장이 없습니다.");
  if(entries.some(e=>!SHIPPING_MODES.includes(e.mode as typeof SHIPPING_MODES[number])))throw new Error("운송구분을 먼저 선택해 주세요.");
  const files=unzipSync(template),base=strFromU8(files["xl/worksheets/sheet1.xml"]);
  const originalData=base.match(/<sheetData\b[^>]*>([\s\S]*?)<\/sheetData>/)?.[1];
  if(!originalData)throw new Error("송장 양식을 불러오지 못했습니다.");
  const rows=[...originalData.matchAll(/<row\b[^>]*\br="(\d+)"[^>]*>[\s\S]*?<\/row>/g)];
  const header=rows.filter(r=>Number(r[1])<8).map(r=>r[0]).join("");
  const style=(address:string)=>base.match(new RegExp(`<c\\b[^>]*\\br="${address}"[^>]*\\bs="(\\d+)"`))?.[1]||"0";
  const styleTop=Array.from("ABCDEFGHIJK",c=>style(c+"8"));
  const styleBottom=Array.from("ABCDEFGHIJK",c=>style(c+"9"));
  const sheetRels=strFromU8(files["xl/worksheets/_rels/sheet1.xml.rels"]);
  const drawingId=sheetRels.match(/<Relationship\b(?=[^>]*Type="[^"]*\/drawing")(?=[^>]*Id="([^"]+)")[^>]*\/?\s*>/)?.[1];
  if(!drawingId)throw new Error("송장 도형 양식이 없습니다.");
  for(const key of Object.keys(files))if(/^xl\/(?:worksheets|drawings)\//.test(key))delete files[key];
  const pages=Math.ceil(entries.length/13),sheets:string[]=[],relations:string[]=[],names:string[]=[],types:string[]=[];
  for(let page=0;page<pages;page++){
    const group=entries.slice(page*13,page*13+13),title=(sender==="baron"?"바론":"홈파트너")+" "+(page+1),lastRow=7+Math.max(1,group.length)*2;
    let body=header.replace(/<c\b(?=[^>]*\br="G6")[^>]*?(?:\/>|>[\s\S]*?<\/c>)/,cell("G6",batch.date,style("G6")));
    for(let slot=0;slot<13;slot++){
      const e=group[slot],r=8+slot*2;
      const values=e?[e.phone,e.recipient,e.address,e.product,e.packaging,e.quantity,"택배\n선불","택배\n착불","화물\n선불","화물\n착불",e.freight]:Array(11).fill(null);
      body+=`<row r="${r}" ht="22" customHeight="1">${values.map((v,index)=>cell(String.fromCharCode(65+index)+r,v,styleTop[index])).join("")}</row>`;
      body+=`<row r="${r+1}" ht="22" customHeight="1">${styleBottom.map((s,index)=>cell(String.fromCharCode(65+index)+(r+1),null,s)).join("")}</row>`;
    }
    let sheet=base.replace(/<sheetData\b[^>]*>[\s\S]*?<\/sheetData>/,`<sheetData>${body}</sheetData>`);
    sheet=sheet.replace(/<pageSetup\b[^>]*\/?\s*>/,`<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="1"/>`);
    files[`xl/worksheets/sheet${page+1}.xml`]=strToU8(sheet);
    files[`xl/worksheets/_rels/sheet${page+1}.xml.rels`]=strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="${drawingId}" Type="${REL}/drawing" Target="../drawings/drawing${page+1}.xml"/></Relationships>`);
    files[`xl/drawings/drawing${page+1}.xml`]=strToU8(circles(group.map(e=>e.mode)));
    sheets.push(`<sheet name="${title}" sheetId="${page+1}" r:id="shipping${page+1}"/>`);
    relations.push(`<Relationship Id="shipping${page+1}" Type="${REL}/worksheet" Target="worksheets/sheet${page+1}.xml"/>`);
    names.push(`<definedName name="_xlnm.Print_Area" localSheetId="${page}">'${title}'!$A$1:$K$${lastRow}</definedName>`);
    types.push(`<Override PartName="/xl/worksheets/sheet${page+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/drawings/drawing${page+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`);
  }
  const book=strFromU8(files["xl/workbook.xml"]).replace(/<sheets\b[^>]*>[\s\S]*?<\/sheets>/,`<sheets>${sheets.join("")}</sheets>`).replace(/<definedNames\b[^>]*>[\s\S]*?<\/definedNames>/,`<definedNames>${names.join("")}</definedNames>`);
  // The native templates retain the r: namespace declaration.
  if(!book.includes(`xmlns:r="${REL}"`))throw new Error("송장 연결 양식을 확인해 주세요.");
  files["xl/workbook.xml"]=strToU8(book);
  files["xl/_rels/workbook.xml.rels"]=strToU8(strFromU8(files["xl/_rels/workbook.xml.rels"]).replace(/<Relationship\b(?=[^>]*Type="[^"]*\/worksheet")[^>]*\/?\s*>/g,"").replace(/<\/Relationships>/,relations.join("")+"</Relationships>"));
  files["[Content_Types].xml"]=strToU8(strFromU8(files["[Content_Types].xml"]).replace(/<Override\b(?=[^>]*PartName="\/xl\/(?:worksheets|drawings)\/)[^>]*\/?\s*>/g,"").replace(/<\/Types>/,types.join("")+"</Types>"));
  return zipSync(files,{level:6});
}
