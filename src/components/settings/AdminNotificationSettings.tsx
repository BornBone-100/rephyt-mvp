"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SettingsState = {
  new_report_notif: boolean;
  expert_post_notif: boolean;
  comment_notif: boolean;
  marketing_notif: boolean;
};

type SettingRowProps = {
  title: string;
  desc: string;
  checked: boolean;
  onToggle: () => void;
};

export default function AdminNotificationSettings({ userId }: { userId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SettingsState>({
    new_report_notif: true,
    expert_post_notif: true,
    comment_notif: true,
    marketing_notif: false,
  });

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await (supabase as any)
        .from("user_notification_settings")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (data) {
        setSettings((prev) => ({
          ...prev,
          ...data,
        }));
      }
      setLoading(false);
    }
    void fetchSettings();
  }, [supabase, userId]);

  const handleToggle = async (key: keyof SettingsState) => {
    const newValue = !settings[key];
    setSettings((prev) => ({ ...prev, [key]: newValue }));

    const { error } = await (supabase as any).from("user_notification_settings").upsert({
      user_id: userId,
      [key]: newValue,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("알림 설정 저장 실패:", error.message);
      setSettings((prev) => ({ ...prev, [key]: !newValue }));
    }
  };

  if (loading) return <div className="animate-pulse p-10 text-xs text-zinc-400">설정 로딩 중...</div>;

  return (
    <div className="max-w-2xl overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-sm">
      <div className="bg-[#001A3D] px-8 py-8 text-white">
        <h2 className="text-xl font-bold tracking-tight">Notification Channels</h2>
        <p className="mt-1 text-xs text-indigo-200 opacity-80">실시간 임상 데이터와 전문가 통찰을 놓치지 않도록 관리합니다.</p>
      </div>

      <div className="space-y-10 p-8">
        <section>
          <div className="mb-6 flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-indigo-600" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-600">Clinical Core</h3>
          </div>
          <div className="space-y-8">
            <SettingRow
              title="AI Clinical Analysis"
              desc="새로운 환자 분석 리포트가 생성되면 즉시 알림"
              checked={settings.new_report_notif}
              onToggle={() => handleToggle("new_report_notif")}
            />
            <SettingRow
              title="Master's Insight"
              desc="10년 차 이상 베테랑 치료사의 새로운 임상 케이스 알림"
              checked={settings.expert_post_notif}
              onToggle={() => handleToggle("expert_post_notif")}
            />
          </div>
        </section>

        <section>
          <div className="mb-6 flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-zinc-300" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Communication</h3>
          </div>
          <div className="space-y-8">
            <SettingRow
              title="Peer Feedback"
              desc="내 게시글에 새로운 전문가 의견(댓글)이 등록될 때"
              checked={settings.comment_notif}
              onToggle={() => handleToggle("comment_notif")}
            />
          </div>
        </section>
      </div>

      <div className="border-t border-zinc-100 bg-zinc-50 px-8 py-4">
        <p className="text-[10px] italic text-zinc-400">"Data is honest, and care is executed precisely." — Re:PhyT Admin</p>
      </div>
    </div>
  );
}

function SettingRow({ title, desc, checked, onToggle }: SettingRowProps) {
  return (
    <div className="group flex items-center justify-between">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-bold text-slate-800 transition-colors group-hover:text-indigo-600">{title}</span>
        <span className="max-w-[240px] text-[11px] leading-relaxed text-slate-400">{desc}</span>
      </div>
      <button
        onClick={onToggle}
        className={`h-6 w-11 rounded-full p-1 transition-all duration-300 ${checked ? "bg-indigo-600" : "bg-zinc-200"}`}
      >
        <div className={`h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-300 ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}
