"use client";

import { useState } from "react";

type NotificationSettingsState = {
  newReport: boolean;
  expertPost: boolean;
  comments: boolean;
  marketing: boolean;
};

type ToggleItemProps = {
  title: string;
  desc: string;
  enabled: boolean;
  onToggle: () => void;
};

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettingsState>({
    newReport: true,
    expertPost: true,
    comments: false,
    marketing: false,
  });

  const toggleSetting = (key: keyof NotificationSettingsState) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    // TODO: Supabase user_settings 테이블 업데이트 로직 연결
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="border-b border-zinc-100 px-5 py-6">
        <h2 className="text-xl font-black text-slate-900">알림 설정</h2>
        <p className="mt-1 text-xs text-slate-400">꼭 필요한 임상 정보만 정교하게 전달합니다.</p>
      </div>

      <div className="flex-1 space-y-8 px-5 py-4">
        <section>
          <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-indigo-600">중요 알림</h3>
          <div className="space-y-6">
            <ToggleItem
              title="신규 AI 분석 리포트"
              desc="담당 환자의 분석이 완료되면 즉시 알림"
              enabled={settings.newReport}
              onToggle={() => toggleSetting("newReport")}
            />
            <ToggleItem
              title="10년차 마스터 임상 공유"
              desc="베테랑 전문가의 새로운 케이스 알림"
              enabled={settings.expertPost}
              onToggle={() => toggleSetting("expertPost")}
            />
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">커뮤니티 및 혜택</h3>
          <div className="space-y-6">
            <ToggleItem
              title="댓글 및 답글"
              desc="내 게시글에 새로운 의견이 달릴 때"
              enabled={settings.comments}
              onToggle={() => toggleSetting("comments")}
            />
            <ToggleItem
              title="이벤트 및 업데이트"
              desc="서비스 기능 개선 및 이벤트 정보"
              enabled={settings.marketing}
              onToggle={() => toggleSetting("marketing")}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function ToggleItem({ title, desc, enabled, onToggle }: ToggleItemProps) {
  return (
    <div className="group flex items-center justify-between">
      <div className="flex flex-col">
        <span className="text-sm font-bold text-slate-800">{title}</span>
        <span className="text-[11px] text-slate-400">{desc}</span>
      </div>
      <button
        onClick={onToggle}
        className={`relative h-6 w-12 rounded-full transition-all duration-300 ${
          enabled ? "bg-indigo-600" : "bg-slate-200"
        }`}
      >
        <div
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all duration-300 ${
            enabled ? "left-7" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
