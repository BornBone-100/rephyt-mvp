"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import type { Tables } from "@/types/supabase";
import type { getDictionary } from "@/dictionaries/getDictionary";

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

type Props = {
  dict: Dictionary;
};

export function PatientsListClient({ dict }: Props) {
  const d = dict.dashboard.patients;
  const router = useRouter();
  const params = useParams();
  const lang = params.lang as string;
  const base = `/${lang}`;
  const supabase = useMemo(() => createClient(), []);
  const [patients, setPatients] = useState<Tables<"patients">[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPatients = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setPatients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void fetchPatients();
  }, [fetchPatients]);

  const handleDelete = async (id: string) => {
    if (window.confirm(d.confirmDelete)) {
      const { error } = await supabase.from("patients").delete().eq("id", id);
      if (!error) {
        fetchPatients();
      } else {
        alert(d.deleteFailedPrefix + error.message);
      }
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert(d.logoutError);
    } else {
      router.push(`${base}/login`);
    }
  };

  const filteredPatients = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return patients;

    return patients.filter((patient) => {
      const name = patient.name?.toLowerCase() ?? "";
      const diagnosis = patient.diagnosis?.toLowerCase() ?? "";
      const phone = patient.phone?.toLowerCase() ?? "";
      return name.includes(keyword) || diagnosis.includes(keyword) || phone.includes(keyword);
    });
  }, [patients, searchQuery]);

  const formatAge = (age: number | null) => {
    if (age == null) return "-";
    return `${age}${d.ageSuffix}`;
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10 pb-32">
      <div className="mb-8 border-b border-zinc-200 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-blue-950">{d.pageTitle}</h1>
          <p className="mt-2 text-sm text-zinc-600">{d.pageSubtitle}</p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            type="button"
            onClick={handleLogout}
            className="h-12 px-5 rounded-xl text-sm font-bold text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            {d.logout}
          </button>
          <button
            type="button"
            onClick={() => void fetchPatients()}
            className="h-12 rounded-xl bg-white border border-zinc-200 px-6 font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-50 flex items-center gap-2"
          >
            {d.refresh}
          </button>
          <Link href={`${base}/dashboard/patients/new`}>
            <span className="inline-flex h-12 items-center rounded-xl bg-orange-500 px-6 font-bold text-white shadow-lg transition hover:bg-orange-600">
              {d.newPatient}
            </span>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="border-b border-zinc-100 bg-zinc-50/40 p-4 md:p-5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={d.searchPlaceholder}
            className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-zinc-50/50 border-b border-zinc-200 text-zinc-500">
              <tr>
                <th className="px-6 py-5 font-bold">{d.colName}</th>
                <th className="px-6 py-5 font-bold">{d.colGenderAge}</th>
                <th className="px-6 py-5 font-bold">{d.colDiagnosis}</th>
                <th className="px-6 py-5 font-bold">{d.colPhone}</th>
                <th className="px-6 py-5 font-bold text-right">{d.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 font-bold animate-pulse">
                    {d.loading}
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 font-bold">
                    {d.emptyPatients}
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 font-bold">
                    {d.emptySearch}
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-zinc-50/50 transition">
                    <td className="px-6 py-5 font-black text-zinc-800 text-base">
                      {patient.name || d.noName}
                    </td>
                    <td className="px-6 py-5 font-medium text-zinc-600">
                      {patient.gender || "-"} / {formatAge(patient.age)}
                    </td>
                    <td className="px-6 py-5 font-bold text-blue-600">
                      {patient.diagnosis || "-"}
                    </td>
                    <td className="px-6 py-5 font-medium text-zinc-600">
                      {patient.phone || "-"}
                    </td>
                    <td className="px-6 py-5 text-right space-x-2">
                      <Link href={`${base}/dashboard/patients/${patient.id}`}>
                        <span className="inline-block px-4 py-2 rounded-lg bg-zinc-100 text-zinc-700 font-bold hover:bg-zinc-200 transition text-xs">
                          {d.viewChart}
                        </span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => void handleDelete(patient.id)}
                        className="px-4 py-2 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 transition text-xs"
                      >
                        {d.delete}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
