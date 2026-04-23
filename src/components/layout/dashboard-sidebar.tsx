"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarLabels = {
  core: string;
  home: string;
  patients: string;
  newSoap: string;
  insights: string;
  analytics: string;
  library: string;
  communityGroup: string;
  community: string;
  activity: string;
  system: string;
  settings: string;
  help: string;
};

type Props = {
  base: string;
  labels: SidebarLabels;
};

export function DashboardSidebar({ base, labels }: Props) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const linkClass = (href: string) =>
    `flex items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
      isActive(href)
        ? "bg-indigo-600 text-white"
        : "text-slate-900 hover:bg-indigo-50 hover:text-indigo-700"
    }`;

  const groupTitleClass = "px-2 text-[11px] font-black uppercase tracking-widest text-slate-400";

  return (
    <aside className="w-full border-b border-zinc-200 bg-white md:w-64 md:border-b-0 md:border-r">
      <nav className="flex flex-col gap-4 p-4">
        <section className="space-y-1.5">
          <p className={groupTitleClass}>{labels.core}</p>
          <Link href={`${base}/dashboard`} prefetch={true} className={linkClass(`${base}/dashboard`)}>
            <span className="flex items-center gap-2 text-slate-900">
              <span className="text-lg">🏠</span>
              {labels.home}
            </span>
          </Link>
          <Link href={`${base}/dashboard/patients`} prefetch={true} className={linkClass(`${base}/dashboard/patients`)}>
            <span className="flex items-center gap-2 text-slate-900">
              <span className="text-lg">🧑‍⚕️</span>
              {labels.patients}
            </span>
          </Link>
          <Link href={`${base}/dashboard/soap/new`} prefetch={true} className={linkClass(`${base}/dashboard/soap/new`)}>
            <span className="flex items-center gap-2 text-slate-900">
              <span className="text-lg">📝</span>
              {labels.newSoap}
            </span>
          </Link>
        </section>

        <section className="space-y-1.5">
          <p className={groupTitleClass}>{labels.insights}</p>
          <Link href={`${base}/dashboard/insights`} prefetch={true} className={linkClass(`${base}/dashboard/insights`)}>
            <span className="flex items-center gap-2 text-slate-900">
              <span className="text-lg">📊</span>
              {labels.analytics}
            </span>
          </Link>
          <Link href={`${base}/dashboard/library`} prefetch={true} className={linkClass(`${base}/dashboard/library`)}>
            <span className="flex items-center gap-2 text-slate-900">
              <span className="text-lg">📚</span>
              {labels.library}
            </span>
          </Link>
        </section>

        <section className="space-y-1.5">
          <p className={groupTitleClass}>{labels.communityGroup}</p>
          <Link href={`${base}/dashboard/community`} prefetch={true} className={linkClass(`${base}/dashboard/community`)}>
            <span className="flex items-center gap-2 text-slate-900">
              <span className="text-lg">🌍</span>
              {labels.community}
            </span>
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
              New
            </span>
          </Link>
          <Link href={`${base}/dashboard/activity`} prefetch={true} className={linkClass(`${base}/dashboard/activity`)}>
            <span className="flex items-center gap-2 text-slate-900">
              <span className="text-lg">🧾</span>
              {labels.activity}
            </span>
          </Link>
        </section>

        <section className="space-y-1.5">
          <p className={groupTitleClass}>{labels.system}</p>
          <Link href={`${base}/dashboard/settings`} prefetch={true} className={linkClass(`${base}/dashboard/settings`)}>
            <span className="flex items-center gap-2 text-slate-900">
              <span className="text-lg">⚙️</span>
              {labels.settings}
            </span>
          </Link>
          <Link href={`${base}/dashboard/settings?section=help`} prefetch={true} className={linkClass(`${base}/dashboard/settings`)}>
            <span className="flex items-center gap-2 text-slate-900">
              <span className="text-lg">🆘</span>
              {labels.help}
            </span>
          </Link>
        </section>
      </nav>
    </aside>
  );
}
