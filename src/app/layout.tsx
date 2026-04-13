import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Re:PhyT AI - SOAP 노트 자동 생성",
  description: "물리치료 SOAP 노트를 AI로 자동 생성하고 효율적으로 관리하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        {/* 페이지 메인 콘텐츠 영역 */}
        <main className="flex-grow">
          {children}
        </main>

        {/* 📜 사업자 정보 푸터 (포트원 심사 필수 항목) */}
        <footer className="bg-zinc-50 border-t border-zinc-200 py-12 px-6">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
              
              {/* 로고 및 슬로건 */}
              <div className="space-y-3">
                <div className="text-xl font-black text-blue-950 tracking-tighter">Re:PhyT AI</div>
                <p className="text-sm text-zinc-500 font-medium">
                  데이터로 증명하는 정교한 물리치료 차팅 솔루션
                </p>
              </div>

              {/* 실제 사업자 정보 (심사팀 확인용) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-2">
                <div className="flex gap-2">
                  <span className="text-zinc-400 text-xs font-bold w-20">상호명</span>
                  <span className="text-zinc-600 text-xs font-medium">Re:PhyT (리피트)</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-zinc-400 text-xs font-bold w-20">대표자명</span>
                  <span className="text-zinc-600 text-xs font-medium">김성준</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-zinc-400 text-xs font-bold w-20">사업자번호</span>
                  <span className="text-zinc-600 text-xs font-medium font-mono text-blue-600">494-37-01613</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-zinc-400 text-xs font-bold w-20">문의번호</span>
                  <span className="text-zinc-600 text-xs font-medium font-mono">010-5900-6834</span>
                </div>
                <div className="flex gap-2 sm:col-span-2">
                  <span className="text-zinc-400 text-xs font-bold w-20">주소</span>
                  <span className="text-zinc-600 text-xs font-medium">
                    경상남도 창원시 마산합포구 현동 9길 13, 103동 503호
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-zinc-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest">
                © 2026 Re:PhyT AI Labs. All rights reserved.
              </p>
              <div className="flex gap-6 text-[11px] font-bold text-zinc-400">
                <button className="hover:text-zinc-900 transition text-[11px] font-bold">이용약관</button>
                <button className="hover:text-zinc-900 transition underline underline-offset-4 text-[11px] font-bold">개인정보처리방침</button>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
