import { NextRequest, NextResponse } from "next/server";
import { koreanHolidays } from "@/lib/korean-holidays";
export async function GET(request:NextRequest) {
  const year=Number(new URL(request.url).searchParams.get("year"));
  if(!Number.isInteger(year) || year<2000 || year>2099)return NextResponse.json({success:false,message:"연도를 확인해주세요."},{status:400});
  const data={...koreanHolidays(year-1),...koreanHolidays(year),...koreanHolidays(year+1)};
  return NextResponse.json({success:true,data},{headers:{"Cache-Control":"public, max-age=86400"}});
}
