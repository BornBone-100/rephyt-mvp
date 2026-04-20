"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarLabels = {
  home: string;
  patients: string;
  newSoap: string;
  community: string;
  settings: string;
};

type Props = {
  base: string;
  labels: SidebarLabels;
};

export function DashboardSidebar({ base, labels }: Props) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const linkClass = (href: string) =>
    `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition-colors ${
      isActive(href)
        ? "bg-blue-950 text-white"
        : "text-zinc-600 hover:bg-zinc-100 hover:text-blue-950"
    }`;

  return (
    <aside className="w-full border-b border-zinc-200 bg-white md:w-64 md:border-b-0 md:border-r">
      <nav className="flex flex-col gap-2 p-4">
        <Link href={`${base}/dashboard`} className={linkClass(`${base}/dashboard`)}>
          <span className="text-lg">🏠</span>
          {labels.home}
        </Link>
        <Link href={`${base}/dashboard/patients`} className={linkClass(`${base}/dashboard/patients`)}>
          <span className="text-lg">🧑‍⚕️</span>
          {labels.patients}
        </Link>
        <Link href={`${base}/dashboard/soap/new`} className={linkClass(`${base}/dashboard/soap/new`)}>
          <span className="text-lg">📝</span>
          {labels.newSoap}
        </Link>

        <div className="my-4 border-t border-zinc-200" />

        <Link href={`${base}/dashboard/community`} className={linkClass(`${base}/dashboard/community`)}>
          <span className="text-lg">🌍</span>
          {labels.community}
        </Link>
        <Link href={`${base}/dashboard/settings`} className={linkClass(`${base}/dashboard/settings`)}>
          <span className="text-lg">⚙️</span>
          {labels.settings}
        </Link>
      </nav>
    </aside>
  );
}
