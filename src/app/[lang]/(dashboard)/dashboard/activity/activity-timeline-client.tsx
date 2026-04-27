"use client";

import { ActivityTimeline, mapActivityItemToTimelineLog } from "@/components/dashboard/TimelineSync";
import { useEffect, useState } from "react";

type ActivityItem = {
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

function dedupeById(items: ActivityItem[]): ActivityItem[] {
  const map = new Map<string, ActivityItem>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return [...map.values()].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

function mergeById(prev: ActivityItem[], incoming: ActivityItem): ActivityItem[] {
  const exists = prev.some((item) => item.id === incoming.id);
  const next = exists
    ? prev.map((item) => (item.id === incoming.id ? incoming : item))
    : [incoming, ...prev];
  return dedupeById(next);
}

export default function ActivityTimelineClient({
  initialTimeline,
  locale,
}: {
  initialTimeline: ActivityItem[];
  locale: string;
}) {
  const [activities, setActivities] = useState<ActivityItem[]>(() => dedupeById(initialTimeline));

  // Strict Mode에서 effect가 두 번 돌더라도 서버 데이터는 항상 교체 기반으로 유지합니다.
  useEffect(() => {
    setActivities(dedupeById(initialTimeline));
  }, [initialTimeline]);

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

  const localeNorm = locale === "en" ? "en" : "ko";

  return (
    <div className="mt-4">
      <ActivityTimeline
        logs={activities.map((item) => mapActivityItemToTimelineLog(item, localeNorm))}
        locale={localeNorm}
      />
    </div>
  );
}
