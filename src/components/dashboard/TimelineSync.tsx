import Link from "next/link";

/** CDSS / 활동 피드에서 동기화된 한 줄 — 질병명·‘진단’ 문구 대신 평가 부위·ROM·케어 가이드 수 */
export type ActivityTimelineLog = {
  id: string;
  evaluation_area: string;
  created_at: string;
  /** 상대시각 등 표시용(있으면 우선) */
  created_at_label?: string;
  data: {
    rom?: number | string | null;
    care_count?: number | null;
  };
  href?: string;
};

export type ActivityTimelineProps = {
  logs: ActivityTimelineLog[];
  locale?: "ko" | "en";
};

export type TimelineSyncActivityItem = {
  id: string;
  type: "report" | "community" | "export";
  createdAt: string;
  title: string;
  description: string;
  evaluation_area?: string | null;
  care_guide?: string | null;
  evaluation_data?: { rom?: number | string | null } | null;
  href?: string;
};

function formatActivityTimelineRelative(iso: string, locale: "ko" | "en") {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.round(diffMs / (1000 * 60));
  const rtf = new Intl.RelativeTimeFormat(locale === "en" ? "en" : "ko", { numeric: "auto" });
  if (Math.abs(mins) < 60) return rtf.format(-mins, "minute");
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return rtf.format(-hours, "hour");
  const days = Math.round(hours / 24);
  return rtf.format(-days, "day");
}

function parseRomFromText(text: string): number | string | undefined {
  const rom = text.match(/\bROM\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (rom) return rom[1];
  const deg = text.match(/([0-9]+(?:\.[0-9]+)?)\s*°/);
  if (deg) return deg[1];
  return undefined;
}

function parseCareCountFromText(text: string): number | undefined {
  const a = text.match(/(\d+)\s*개\s*케어/i);
  if (a) return Number(a[1]);
  const b = text.match(/케어\s*가이드[^0-9]*(\d+)/i);
  if (b) return Number(b[1]);
  return undefined;
}

function evaluationAreaFromItem(item: TimelineSyncActivityItem, locale: "ko" | "en"): string {
  const blob = `${item.title} ${item.description}`;
  const bodyHint = blob.match(/(무릎|어깨|허리|목|발목|손목|고관절|슬관절)/);
  if (bodyHint) return bodyHint[1];
  if (item.type === "community") return locale === "en" ? "Community" : "커뮤니티";
  if (item.type === "export") return locale === "en" ? "SOAP chart" : "SOAP 차트";
  return locale === "en" ? "Target site" : "대상";
}

/**
 * 기존 Activity 피드 항목을 타임라인 카드용 로그로 변환(설명·제목에 ROM/케어 숫자가 있으면 추출).
 */
export function mapActivityItemToTimelineLog(
  item: TimelineSyncActivityItem,
  locale: "ko" | "en" = "ko"
): ActivityTimelineLog {
  const text = `${item.title} ${item.description}`;
  const evaluationArea = item.evaluation_area || evaluationAreaFromItem(item, locale);
  const careGuide =
    typeof item.care_guide === "string" && item.care_guide.trim().length > 0
      ? item.care_guide
      : undefined;
  const romFromColumn = item.evaluation_data?.rom;
  const rom = romFromColumn ?? parseRomFromText(text);
  const careParsed = parseCareCountFromText(text);
  const care_count =
    typeof careParsed === "number" && !Number.isNaN(careParsed)
      ? careParsed
      : careGuide
        ? 1
        : 0;

  return {
    id: item.id,
    evaluation_area: evaluationArea,
    created_at: item.createdAt,
    created_at_label: formatActivityTimelineRelative(item.createdAt, locale),
    data: { rom, care_count },
    href: item.href,
  };
}

function displayRom(rom: number | string | null | undefined): string {
  if (rom === null || rom === undefined || rom === "") return "—";
  return String(rom);
}

function displayCare(care_count: number | null | undefined): number {
  if (typeof care_count === "number" && !Number.isNaN(care_count)) return care_count;
  return 0;
}

function headlineForLog(log: ActivityTimelineLog, isEn: boolean): string {
  const area = log.evaluation_area;
  const siteLineKo = `${area} 부위 임상 분석 완료`;
  const siteLineEn = `${area} — clinical data analysis complete`;
  if (isEn) {
    if (area === "Community") return "Community clinical data share";
    if (area === "SOAP chart") return "SOAP clinical record export";
    return siteLineEn;
  }
  if (area === "커뮤니티") return "커뮤니티 임상 데이터 공유";
  if (area === "SOAP 차트") return "SOAP 임상 기록보내기";
  return siteLineKo;
}

export function ActivityTimeline({ logs, locale = "ko" }: ActivityTimelineProps) {
  const isEn = locale === "en";

  return (
    <div className="space-y-4">
      {logs.map((log) => {
        const romDisp = displayRom(log.data.rom);
        const careN = displayCare(log.data.care_count);
        const timeLabel = log.created_at_label ?? log.created_at;

        const card = (
          <div className="flex gap-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm transition-colors hover:border-zinc-200">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50">
              <span className="text-lg" aria-hidden>
                📊
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-black text-slate-900">{headlineForLog(log, isEn)}</h4>
                <span className="shrink-0 text-[10px] text-zinc-400">{timeLabel}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {isEn
                  ? `ROM ${romDisp}° analysis and ${careN} care guide${careN === 1 ? "" : "s"} generated`
                  : `ROM ${romDisp}° 분석 및 ${careN}개 케어 가이드 생성`}
              </p>
            </div>
          </div>
        );

        if (log.href) {
          return (
            <Link key={log.id} href={log.href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
              {card}
            </Link>
          );
        }

        return <div key={log.id}>{card}</div>;
      })}
    </div>
  );
}

/** 프로필 플랜·경력 동기화 — DB 컬럼과 `metadata` 보조 파싱은 `rephyt-profile-sync` 참고 */
export { rephytProfileSyncFromRow } from "@/lib/rephyt/rephyt-profile-sync";
