import Link from "next/link";
import { Smartphone, Share2, SquarePlus, Check } from "lucide-react";

export default function InstallPage() {
  return <div className="mx-auto max-w-xl space-y-5 pb-16">
    <header className="space-y-3">
      <span className="inline-flex rounded-2xl bg-slate-950 p-3 text-white"><Smartphone className="h-7 w-7" /></span>
      <h1 className="text-2xl font-bold text-slate-950">BALON 앱 설치</h1>
      <p className="text-sm leading-6 text-slate-600">홈 화면에 BALON을 추가하면 아이콘을 눌러 앱처럼 바로 실행할 수 있습니다.</p>
    </header>
    <section aria-label="아이폰 설치 방법" className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-bold">아이폰 · 아이패드</h2>
      <ol className="mt-4 list-decimal space-y-4 pl-5 text-sm leading-6 text-slate-700">
        <li><strong>Safari</strong>에서 <a className="font-semibold text-blue-700 underline" href="https://balononline.vercel.app">BALON 운영 사이트</a>를 엽니다.</li>
        <li><Share2 aria-hidden="true" className="mr-1 inline h-4 w-4" /><strong>공유</strong> 버튼을 누릅니다. 공유 버튼이 보이지 않으면 메뉴(…) 안에서 찾을 수 있습니다.</li>
        <li><SquarePlus aria-hidden="true" className="mr-1 inline h-4 w-4" /><strong>홈 화면에 추가</strong>를 선택합니다.</li>
        <li><strong>웹 앱으로 열기</strong> 옵션이 보이면 켠 뒤 <strong>추가</strong>를 누릅니다.</li>
      </ol>
      <p className="mt-5 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-900">추가한 BALON 아이콘을 눌러 실행하고 기존 직원 계정으로 로그인하세요. 앱스토어 등록이나 별도 설치 파일은 필요하지 않습니다.</p>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-bold">안드로이드 · PC에서도 설치할 수 있습니다</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Chrome 또는 Edge의 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택하세요.</p>
    </section>
    <p className="flex items-start gap-2 text-xs leading-5 text-slate-500"><Check className="mt-0.5 h-4 w-4 shrink-0" />업무·도면·사진 저장에는 인터넷 연결이 필요합니다. 설치 후에도 앱 업데이트는 배포된 최신 버전으로 반영됩니다.</p>
    <Link href="/" className="action-primary">BALON 열기</Link>
  </div>;
}
