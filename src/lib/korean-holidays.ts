import Holidays from "date-holidays";

const cache=new Map<number,Record<string,string>>();
export function koreanHolidays(year:number):Record<string,string> {
  const existing=cache.get(year);if(existing)return existing;
  const result:Record<string,string>={};
  const holidays=new Holidays("KR");
  const koreanDate=(date:Date)=>new Date(date.getTime()+9*3600000).toISOString().slice(0,10);
  for(const holiday of holidays.getHolidays(year).filter(holiday=>holiday.type === "public")) {
    // The package anchors the three-day Seollal span on New Year's day; Korea's holiday starts the day before.
    const correction=holiday.name === "설날" ? 86400000 : 0;
    const start=new Date(holiday.start.getTime()-correction),end=holiday.end.getTime()-correction;
    const name=holiday.name.replace(/석가탄신일/g,"부처님오신날").replace(/기독탄신일/g,"성탄절");
    for(let time=start.getTime();time<end;time+=86400000)result[koreanDate(new Date(time))]=name;
  }
  // KASA's updated 2026/2027 calendar announcement includes Labor Day from 2026.
  if(year>=2026) {
    const date=`${year}-05-01`;result[date]="노동절";
    const day=new Date(`${date}T12:00:00Z`).getUTCDay();
    if(day===0 || day===6) {let time=new Date(`${date}T00:00:00+09:00`).getTime()+86400000;while([0,6].includes(new Date(time+9*3600000).getUTCDay()) || result[koreanDate(new Date(time))])time+=86400000;result[koreanDate(new Date(time))]="노동절 (대체공휴일)";}
  }
  if(year===2026)result["2026-06-03"]="지방선거";
  if(year===2027)result["2027-06-07"]="현충일 (대체공휴일)";
  if(cache.size>=10)cache.delete(cache.keys().next().value!);
  cache.set(year,result);return result;
}
