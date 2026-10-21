import type { WorkItem } from "@/types";

export function getProjectLocation(address: string, region = ""): string {
  const tokens = address.trim().split(/[\s,()]+/).filter(Boolean);
  const neighborhood = tokens.find(token => /^[가-힣]+\d*(?:동|가)$/.test(token));
  if (neighborhood) return neighborhood;
  const district = tokens.find(token => /^[가-힣]+구$/.test(token));
  if (district) return district;
  const town = tokens.find(token => /^[가-힣]+(?:읍|면)$/.test(token));
  if (town) return town;
  const area = tokens.find(token => /^(?:반포|일산|판교|분당)(?:[가-힣]*)$/.test(token));
  if (area) return area;
  const broadArea = /^(?:서울|부산|대구|인천|광주|대전|울산|세종)(?:시|특별시|광역시|특별자치시)?$|(?:도|특별자치도)$/;
  const localTokens = tokens.filter(token => !broadArea.test(token));
  const city = localTokens.find(token => /^[가-힣]+(?:시|군)$/.test(token));
  return city || (region.trim() && !broadArea.test(region.trim()) ? region.trim() : "") || (localTokens[0]?.match(/^[가-힣]+$/) ? localTokens[0] : "");
}

export function generateWorkTitle(clientName: string, address: string, region = ""): string {
  return [clientName.trim(), getProjectLocation(address, region)].filter(Boolean).join(", ");
}

export function getWorkTitle(item: Pick<WorkItem, "title" | "clientName" | "siteAddress" | "region">): string {
  const title = item.title?.replace(/\s*\((?:천정형|에보라|옴니버스|기타)\)\s*$/, "").trim();
  return title || generateWorkTitle(item.clientName || "", item.siteAddress || "", item.region || "") || "제목 없는 업무";
}
