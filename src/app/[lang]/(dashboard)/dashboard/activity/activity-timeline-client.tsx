"use client";

import Link from "next/link";
import { ShieldCheck, Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";

type ActivityItem = {
  id: string;
  type: "report" | "community" | "export";
  createdAt: string;
  title: string;
  description: string;
  href?: string;
};

function formatRelative(iso: string, locale: string) {
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

function mergeById(prev: ActivityItem[], incoming: ActivityItem): ActivityItem[] {
  const exists = prev.some((item) => item.id === incoming.id);
  const next = exists
    ? prev.map((item) => (item.id === incoming.id ? incoming : item))
    : [incoming, ...prev];
  return next.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export default function ActivityTimelineClient({
  initialTimeline,
  locale,
}: {
  initialTimeline: ActivityItem[];
  locale: string;
}) {
  const [activities, setActivities] = useState<ActivityItem[]>(initialTimeline);

  useEffect(() => {
    const cached = window.localStorage.getItem("rephyt:latest-activity");
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as {
          id: string;
          type: "report";
          createdAt: string;
          title: string;
          description: string;
          metadata?: { report_id?: string; patient_id?: string };
        };
        if (parsed?.id && parsed.metadata?.patient_id) {
          const incoming: ActivityItem = {
            id: `report-${parsed.id}`,
            type: "report",
            createdAt: parsed.createdAt,
            title: parsed.title,
            description: parsed.description,
            href: `/${locale}/dashboard/patients/${encodeURIComponent(parsed.metadata.patient_id)}?reportId=${encodeURIComponent(parsed.metadata.report_id ?? parsed.id)}`,
          };
          setActivities((prev) => mergeById(prev, incoming));
        }
      } catch {
        // ignore malformed cache
      }
    }
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{
        id: string;
        type: "report";
        createdAt: string;
        title: string;
        description: string;
        metadata?: { report_id?: string; patient_id?: string };
      }>;
      const detail = custom.detail;
      if (!detail?.id || !detail.metadata?.patient_id) return;
      const incoming: ActivityItem = {
        id: `report-${detail.id}`,
        type: "report",
        createdAt: detail.createdAt,
        title: detail.title,
        description: detail.description,
        href: `/${locale}/dashboard/patients/${encodeURIComponent(detail.metadata.patient_id)}?reportId=${encodeURIComponent(detail.metadata.report_id ?? detail.id)}`,
      };
      setActivities((prev) => mergeById(prev, incoming));
    };
    window.addEventListener("rephyt:activity-created", handler);
    return () => window.removeEventListener("rephyt:activity-created", handler);
  }, [locale]);

  return (
    <ul className="mt-4 space-y-2">
      {activities.map((item) => (
        <li key={item.id} className="rounded-xl border border-slate-100 px-3 py-3 hover:bg-slate-50">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                {item.type === "report" ? (
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                ) : item.type === "community" ? (
                  <Stethoscope className="h-4 w-4 text-indigo-600" />
                ) : (
                  "📄"
                )}{" "}
                {item.title}
              </p>
              <p className="mt-1 truncate text-xs text-slate-500">{item.description}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-slate-400">{formatRelative(item.createdAt, locale)}</p>
              {item.href ? (
                <Link href={item.href} className="mt-1 inline-block text-xs font-bold text-indigo-600">
                  보기
                </Link>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
