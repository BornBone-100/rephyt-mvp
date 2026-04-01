"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const ebpDatabase = {
  cervical: [{ id: "spurling", name: "Spurling's Test", paper: "Spurling (1944)", purpose: "경추 신경근병증" }],
  shoulder: [{ id: "neer", name: "Neer Test", paper: "Neer (1983)", purpose: "충돌증후군" }],
  lumbar: [{ id: "slr", name: "SLR Test", paper: "Lasegue (1864)", purpose: "디스크" }],
  hip: [{ id: "thomas", name: "Thomas Test", paper: "Thomas (1876)", purpose: "굴곡근 단축" }],
  knee: [{ id: "lachman", name: "Lachman Test", paper: "Torg (1976)", purpose: "ACL" }],
  ankle: [{ id: "thompson", name: "Thompson Test", paper: "Thompson (1962)", purpose: "아킬레스건" }]
};

const jointMovements = {
  cervical: ["Flexion", "Extension", "Rotation"],
  shoulder: ["Flexion", "Abduction", "ER", "IR"],
  lumbar: ["Flexion", "Extension"],
  hip: ["Flexion", "Abduction"],
  knee: ["Flexion", "Extension"],
  ankle: ["Dorsiflexion", "Plantarflexion"]
};

function SoapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId");
  const supabase = createClient();

  const [selectedJoint, setSelectedJoint] = useState<keyof typeof ebpDatabase | "">("");
  const [painScale, setPainScale] = useState<string>("5");
  const [historyTaking, setHistoryTaking] = useState("");
  const [romValues, setRomValues] = useState<Record<string, string>>({});
  const [mmtValues, setMmtValues] = useState<Record<string, string>>({});
  const [specialTests, setSpecialTests] = useState<Record<string, string>>({});
  const [soapData, setSoapData] = useState({ subjective: "", objective: "", assessment: "", plan: "" });
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSoap = async () => {
    if (!patientId) {
      alert("환자가 선택되지 않았습니다. 목록에서 환자를 선택 후 작성해 주세요.");
      return;
    }

    if (!soapData.subjective || !soapData.objective) {
      alert("먼저 'SOAP 자동 완성' 버튼을 눌러 내용을 생성해 주세요.");
      return;
    }

    setIsSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await (supabase as any)
      .from("soap_notes")
      .insert([
        {
          patient_id: patientId,
          created_by: user?.id,
          joint: selectedJoint,
          pain_scale: parseInt(painScale),
          subjective: soapData.subjective,
          objective: soapData.objective,
          assessment: soapData.assessment,
          plan: soapData.plan
        }
      ]);

    if (error) {
      alert("저장 실패: " + error.message);
    } else {
      alert("성준 님, 진료 기록이 안전하게 저장되었습니다.");
      router.push(`/dashboard/patients/${patientId}`);
    }
    setIsSaving(false);
  };

  const generateSoap = () => {
    let obj = `[ROM/MMT]\n`;
    jointMovements[selectedJoint as keyof typeof jointMovements]?.forEach((m) => {
      obj += `${m}: ${romValues[m] || "-"}° (MMT: ${mmtValues[m] || "-"})\n`;
    });
    setSoapData({
      subjective: `[History]\n${historyTaking}\nVAS: ${painScale}/10`,
      objective: obj,
      assessment: `${selectedJoint} 부위 기능 부전 의심.`,
      plan: `물리치료 및 가동성 회복 운동 실시.`
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10 pb-32">
      <h1 className="text-3xl font-black text-blue-950 mb-8 border-b pb-4">전문 SOAP 기록 작성</h1>
      
      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
            <label className="block text-sm font-bold mb-4">병력 청취 (History Taking)</label>
            <textarea
              className="w-full h-24 bg-zinc-50 rounded-xl p-3 text-sm"
              value={historyTaking}
              onChange={(e) => setHistoryTaking(e.target.value)}
            />
            
            <label className="block text-sm font-bold mt-6 mb-2">진단 부위 선택</label>
            <select
              className="w-full h-11 rounded-xl bg-zinc-50 border border-zinc-200 px-4"
              value={selectedJoint}
              onChange={(e) => setSelectedJoint(e.target.value as any)}
            >
              <option value="">부위 선택</option>
              {Object.keys(ebpDatabase).map((k) => <option key={k} value={k}>{k.toUpperCase()}</option>)}
            </select>
          </div>

          <button onClick={generateSoap} className="w-full h-14 bg-orange-500 text-white rounded-xl font-bold shadow-lg">
            EBP 기반 SOAP 자동 완성
          </button>
        </div>

        <div className="lg:col-span-7 space-y-4">
          {["subjective", "objective", "assessment", "plan"].map((key) => (
            <div key={key} className="bg-white p-5 rounded-2xl border border-zinc-200">
              <label className="block text-xs font-black text-blue-400 uppercase mb-2">{key}</label>
              <textarea
                value={soapData[key as keyof typeof soapData]}
                onChange={(e) => setSoapData({ ...soapData, [key]: e.target.value })}
                className="w-full h-32 bg-zinc-50 border-none rounded-xl p-3 text-sm resize-none"
              />
            </div>
          ))}

          <button
            onClick={handleSaveSoap}
            disabled={isSaving}
            className="w-full h-16 bg-blue-950 text-white rounded-2xl font-black shadow-xl hover:bg-blue-900 transition-all mt-6"
          >
            {isSaving ? "진료 기록 보관함에 넣는 중..." : "최종 SOAP 차트 DB 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdvancedSoapPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <SoapContent />
    </Suspense>
  );
}