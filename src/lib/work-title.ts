import type { WorkItem } from "@/types";

export function getProjectLocation(address: string, region = ""): string {
  const tokens = address.trim().split(/[\s,]+/).filter(Boolean);
  const neighborhood = tokens.find(token => /^[가-힣]+(?:\d+가)?동$/.test(token));
  if (neighborhood) return neighborhood;
  const area = tokens.find(token => /^(?:반포|일산|판교|분당)(?:[가-힣]*)$/.test(token));
  if (area) return area;
  const province = tokens.find(token => /^(?:강원도|강원특별자치도|제주도|제주특별자치도|경기도|충청북도|충청남도|전라북도|전북특별자치도|전라남도|경상북도|경상남도)$/.test(token));
  if (province) return province;
  const district = tokens.find(token => /^[가-힣]+(?:시|군|구|읍|면)$/.test(token));
  return district || region.trim() || (tokens[0]?.match(/^[가-힣]+$/) ? tokens[0] : "");
}

export function generateWorkTitle(clientName: string, address: string, region = ""): string {
  return [clientName.trim(), getProjectLocation(address, region)].filter(Boolean).join(", ");
}

export function getWorkTitle(item: Pick<WorkItem, "title" | "clientName" | "siteAddress" | "region">): string {
  return item.title?.trim() || generateWorkTitle(item.clientName || "", item.siteAddress || "", item.region || "") || "제목 없는 업무";
}
