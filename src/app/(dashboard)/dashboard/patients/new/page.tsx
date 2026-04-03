"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function NewPatientPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "남성",
    diagnosis: "",
    phone: "",
    memo: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (authError || !user) {
        alert("로그인 세션이 만료되었거나 확인할 수 없습니다. 다시 로그인해 주세요.");
        setIsSubmitting(false);
        return;
      }

      const ageLine = formData.age.trim() ? `나이: ${formData.age.trim()}세` : "";
      const notesCombined = [formData.memo.trim() || null, ageLine || null].filter(Boolean).join("\n") || null;

      const { error } = await (supabase as any).from("patients").insert([
        {
          full_name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          chief_complaint: formData.diagnosis.trim() || null,
          notes: notesCombined,
          sex: formData.gender === "남성" ? "M" : formData.gender === "여성" ? "F" : "Other",
          created_by: user.id,
          primary_therapist_id: user.id
        }
      ]);

      if (error) throw error;

      alert(`${formData.name} 환자님이 성공적으로 등록되었습니다!`);
      router.push("/dashboard/patients");
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      alert("DB 저장 중 오류가 발생했습니다: " + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard/patients"
            className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 mb-4 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 mr-2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            신규 환자 등록
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900">신규 환자 등록</h1>
          <p className="mt-1 text-sm text-zinc-500">Re:PhyT 케어 시스템에 새로운 환자 정보를 입력해 주세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-zinc-200 p-6 md:p-8 shadow-sm">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">환자 이름</label>
                <input
                  required
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full h-11 rounded-xl border border-zinc-200 px-4 text-sm bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">나이 (세)</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  className="w-full h-11 rounded-xl border border-zinc-200 px-4 text-sm bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">성별</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="남성"
                    checked={formData.gender === "남성"}
                    onChange={handleChange}
                    className="w-4 h-4 accent-blue-600"
                  />{" "}
                  남성
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="여성"
                    checked={formData.gender === "여성"}
                    onChange={handleChange}
                    className="w-4 h-4 accent-blue-600"
                  />{" "}
                  여성
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">주진단명 (Diagnosis)</label>
              <input
                type="text"
                name="diagnosis"
                value={formData.diagnosis}
                onChange={handleChange}
                className="w-full h-11 rounded-xl border border-zinc-200 px-4 text-sm bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">연락처</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full h-11 rounded-xl border border-zinc-200 px-4 text-sm bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">특이사항 (Memo)</label>
              <textarea
                name="memo"
                value={formData.memo}
                onChange={handleChange}
                className="w-full h-24 rounded-xl border border-zinc-200 p-4 text-sm bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none resize-none transition"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-12 px-8 rounded-xl bg-blue-950 text-white font-bold text-sm shadow-md transition hover:bg-blue-900 disabled:opacity-50"
            >
              {isSubmitting ? "등록 중..." : "환자 등록 완료"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
