"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  UploadCloud,
  AlertCircle,
  BrainCircuit,
  Activity,
  FileText,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Eye,
  EyeOff,
  SlidersHorizontal,
} from "lucide-react";

/** 부위 코드 — AI/백엔드에서 내려주는 region 코드와 1:1 매핑 가능 */
type BodyPartKey = "SHOULDER" | "LUMBAR" | "KNEE" | "CERVICAL";

type BodyMetricDef = {
  name: string;
  normal: string;
  unit: string;
};

type BodyKnowledge = {
  label: string;
  /** 주요 평가 요지 (질병 단정 없이 물리치료 평가 관점) */
  primaryEvaluation: string;
  metrics: BodyMetricDef[];
  standardEvidence: string;
  /** 우측 프로토콜·가이드 초안 */
  careGuides: string[];
  /** 통합 패널용 임상 스크리닝 한줄 요약 (정직한 데이터·수치 중심) */
  clinicalReportHeadline: string;
  clinicalReportBullets: string[];
};

const BODY_KNOWLEDGE_BASE: Record<BodyPartKey, BodyKnowledge> = {
  SHOULDER: {
    label: "Shoulder (어깨 관절)",
    primaryEvaluation: "견관부 외회전·거상 시 기능적 가동성 제한 경향",
    metrics: [
      { name: "견봉하 공간 (Subacromial Space)", normal: "9–10", unit: "mm" },
      { name: "극상근 건 두께 (Supraspinatus)", normal: "4–6", unit: "mm" },
    ],
    standardEvidence: "견봉하 부위 고신호 강도 및 연부조직 부종 경향 관찰",
    careGuides: [
      "통증 없는 범위 내 견관절 패킹·등척성 활성화",
      "견봉하 공간 확보를 위한 스캅ular 리듬 교육",
      "회전근개 계열 점진적 부하 (저항 밴드)",
    ],
    clinicalReportHeadline: "견관절 수동 외회전 시 통증 증가 및 ROM 제한",
    clinicalReportBullets: ["• ABER 90° 외회전: 통증 유발", "• Empty can: 중등도 양성"],
  },
  LUMBAR: {
    label: "Lumbar (요추)",
    primaryEvaluation: "요추 L4–L5 수준 기능적 가동성 및 부하 분담 제한 경향",
    metrics: [
      { name: "추간판 돌출 정도 (Disc Protrusion)", normal: "3 이하", unit: "mm" },
      { name: "척추관 유효 직경 (Canal Diameter)", normal: "12 이상", unit: "mm" },
    ],
    standardEvidence: "신경근 주변 신호 변화 및 황색인대 비후 경향 관찰",
    careGuides: [
      "멕켄지 신전 운동 (통증 없는 범위)",
      "요추–골반 리듬 회복 (Pelvic Tilt)",
      "다발성 근육 긴장 완화 (장요근·둔근)",
    ],
    clinicalReportHeadline: "요추 전굴 시 하지 방사통 양성",
    clinicalReportBullets: ["• Flexion ROM: 약 40° 제한", "• SLR (R): 약 35°에서 증상 재현"],
  },
  KNEE: {
    label: "Knee (무릎 관절)",
    primaryEvaluation: "슬개대–대퇴 관절 정렬 및 체중 분담 기능 제한 경향",
    metrics: [
      { name: "관절 간격 (Joint Space)", normal: "4–5", unit: "mm" },
      { name: "인대 신호 강도 (Signal Intensity)", normal: "Low", unit: "idx" },
    ],
    standardEvidence: "반월상 연골 주변 선상 신호 변화 및 관절 삼출 경향",
    careGuides: [
      "체중 분담 교육 및 보행 리듬 재교육",
      "대사두·둔근 활성화 (클램쉘·미니 스쿼트)",
      "슬개골 추적 개선용 폐쇄사슬 운동",
    ],
    clinicalReportHeadline: "계단 하행 시 앞무릎 통증 및 종창 호소",
    clinicalReportBullets: ["• Thessaly test: 중등도 양성", "• 부종 지수: 경도"],
  },
  CERVICAL: {
    label: "Cervical (경추)",
    primaryEvaluation: "경추 배열 및 심부굴근 안정성 기능 저하 경향",
    metrics: [
      { name: "C-Curve 각도 (Cobb)", normal: "20–35", unit: "deg" },
      { name: "추간판 높이 비율 (Disc Height)", normal: "80 이상", unit: "%" },
    ],
    standardEvidence: "경추 전만 소실 경향 및 신경공 주변 신호 변화",
    careGuides: [
      "심부굴근 등척성 (chin tuck)",
      "상흉곽 이완 및 견갑 안정화",
      "자세 교육 (모니터 높이·작업 거리)",
    ],
    clinicalReportHeadline: "장시간 전굴 자세 후 경부 통증 악화",
    clinicalReportBullets: ["• 경추 측만 굴곡: 통증 유발", "• ULTT (median): 경도 양성"],
  },
};

type EvidenceMetric = {
  name: string;
  value: string;
  normal: string;
  unit: string;
};

type ActiveAnalysis = {
  key: BodyPartKey;
  partName: string;
  mainFinding: string;
  confidence: number;
  evidenceList: EvidenceMetric[];
  expertOpinion: string;
  correlationScore: string;
  careGuides: string[];
  clinicalReportHeadline: string;
  clinicalReportBullets: string[];
};

function buildActiveAnalysis(
  partKey: BodyPartKey,
  options?: { confidenceMin?: number; confidenceMax?: number },
): ActiveAnalysis {
  const base = BODY_KNOWLEDGE_BASE[partKey];
  const min = options?.confidenceMin ?? 92;
  const max = options?.confidenceMax ?? 99;
  const confidence = Math.round(Math.random() * (max - min) + min);
  const correlation = (92 + Math.random() * 6).toFixed(1);

  const evidenceList: EvidenceMetric[] = base.metrics.map((m) => ({
    name: m.name,
    value: (Math.random() * 5 + 3).toFixed(1),
    normal: m.normal,
    unit: m.unit,
  }));

  return {
    key: partKey,
    partName: base.label,
    mainFinding: base.primaryEvaluation,
    confidence,
    evidenceList,
    expertOpinion: base.standardEvidence,
    correlationScore: correlation,
    careGuides: base.careGuides,
    clinicalReportHeadline: base.clinicalReportHeadline,
    clinicalReportBullets: base.clinicalReportBullets,
  };
}

/** 가상 AI 히트맵·타깃 박스 중심 좌표 (부위별 시뮬레이션) */
function heatmapFocusPosition(key: BodyPartKey): { top: string; left: string } {
  switch (key) {
    case "SHOULDER":
      return { top: "40%", left: "45%" };
    case "KNEE":
      return { top: "72%", left: "50%" };
    case "CERVICAL":
      return { top: "24%", left: "50%" };
    case "LUMBAR":
    default:
      return { top: "65%", left: "50%" };
  }
}

export default function PreAssessmentScreening() {
  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<ActiveAnalysis | null>(null);

  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState(75);
  const previewUrl = useMemo(() => (selectedFile ? URL.createObjectURL(selectedFile) : ""), [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile) {
      alert("영상을 먼저 업로드해 주세요.");
      return;
    }

    setStep(2);
    setActiveAnalysis(null);

    try {
      // 실제 비전 API 연동 시 예시 (파일명 미사용, 바이너리만 전송):
      // const formData = new FormData();
      // formData.append("file", selectedFile); // 또는 "image" 등 API 스펙에 맞게
      // const response = await fetch("/api/ai-screening/analyze", { method: "POST", body: formData });
      // const realData = await response.json();
      // setActiveAnalysis(buildActiveAnalysis(realData.region as BodyPartKey, { ... }));

      /** 가상 AI 판독: 파일명을 보지 않고 업로드 후 시뮬레이션으로 부위·지표를 생성 (실연동 시 이 블록 제거) */
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const possibleParts: BodyPartKey[] = ["SHOULDER", "LUMBAR", "KNEE", "CERVICAL"];
      const aiDetectedPart = possibleParts[Math.floor(Math.random() * possibleParts.length)];
      setActiveAnalysis(buildActiveAnalysis(aiDetectedPart, { confidenceMin: 95, confidenceMax: 99 }));
      setStep(3);
    } catch {
      alert("AI 분석 중 서버 오류가 발생했습니다.");
      setStep(1);
    }
  };

  const handleExport = (feedbackType: string) => {
    const messages: Record<string, string> = {
      accept: "AI Care Guide가 그대로 SOAP 노트에 이관되었습니다. (학습 데이터: 긍정 기록)",
      modify: "수정 모드로 전환합니다. 수정 후 SOAP 노트에 이관됩니다. (학습 데이터: 파인튜닝 기록)",
      reject: "기각되었습니다. AI 모델 재학습 데이터로 전송됩니다.",
    };
    alert(messages[feedbackType]);
  };

  const handleFinalizeSoap = () => {
    alert("통합 분석 결과가 최종 SOAP 노트로 이관되었습니다.");
  };

  const analysis = activeAnalysis;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 text-slate-800 font-sans bg-slate-50 min-h-screen">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BrainCircuit className="w-7 h-7 text-indigo-600" />
          Re:PhyT AI - 사전 스크리닝 (Global Body-Part Engine)
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          부위 코드에 따라 영상·지표·Care Guide 문구가 동적으로 전환됩니다. 현재는{" "}
          <strong className="text-slate-700">가상 AI 판독(시뮬레이션)</strong> 모드입니다. 본 화면은 의사의 진단을 대체할 수
          없는 보조 도구입니다.
        </p>
      </div>

      <div className="flex items-center justify-between max-w-2xl mx-auto mb-8 px-4">
        {[
          { num: 1, label: "1. 데이터 업로드" },
          { num: 2, label: "2. 멀티모달 AI 분석" },
          { num: 3, label: "3. 결과 및 Care Guide 확정" },
        ].map((item) => (
          <div key={item.num} className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-300 ${
                step >= item.num ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-400"
              }`}
            >
              {step > item.num ? <CheckCircle2 className="w-5 h-5" /> : item.num}
            </div>
            <span className={`text-xs mt-2 font-medium ${step >= item.num ? "text-indigo-900" : "text-slate-400"}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-indigo-500" /> 환자 데이터 업로드
          </h2>

          <div className="space-y-8">
            <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:bg-slate-50 transition cursor-pointer">
              <input
                type="file"
                accept="image/*,video/mp4,.dcm"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
              />
              <UploadCloud className={`w-10 h-10 mx-auto mb-3 ${selectedFile ? "text-green-500" : "text-indigo-400"}`} />
              <p className="text-sm font-semibold text-slate-700">
                {selectedFile ? `첨부됨: ${selectedFile.name}` : "여기를 클릭하여 영상 업로드"}
              </p>
              <p className="text-xs text-slate-500 mt-1">지원 포맷: DICOM, JPG, MP4 (동적 초음파)</p>
            </div>

            <button
              onClick={handleStartAnalysis}
              className="w-full bg-slate-900 text-white text-base font-bold py-4 rounded-xl hover:bg-indigo-700 transition duration-300 flex items-center justify-center gap-2 shadow-md"
            >
              <BrainCircuit className="w-5 h-5" />
              전신 부위 자동 식별 및 정밀 분석
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-16 max-w-3xl mx-auto text-center animate-in fade-in duration-300">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-bold text-slate-800">가상 AI 판독 — 영상 분석 시뮬레이션</h2>
          <p className="text-sm text-slate-500 mt-2">
            파일명이 아닌 업로드 데이터를 기준으로 부위·지표를 산출하는 흐름을 연습합니다. 실서버 연동 시 이 단계가 API
            응답으로 대체됩니다.
          </p>
        </div>
      )}

      {step === 3 && analysis && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="flex flex-col space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  <Activity className="h-5 w-5 text-indigo-500" />
                  AI 분석 히트맵 (Grad-CAM)
                </h2>
                <span className="flex items-center gap-1 rounded bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800">
                  <AlertCircle className="h-3.5 w-3.5" /> 스크리닝 일치도 {analysis.confidence}%
                </span>
              </div>

              <div className="space-y-4">
                <div className="relative flex h-[500px] items-center justify-center overflow-hidden rounded-3xl border border-slate-800 bg-black shadow-2xl">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="업로드된 영상"
                      className="h-full w-full object-contain opacity-80"
                    />
                  ) : (
                    <div className="font-bold italic text-slate-500">No Scan Data</div>
                  )}

                  {showHeatmap && (
                    <div
                      className="pointer-events-none absolute z-10 transition-all duration-500 ease-in-out"
                      style={{
                        top: heatmapFocusPosition(analysis.key).top,
                        left: heatmapFocusPosition(analysis.key).left,
                        width: "180px",
                        height: "180px",
                        transform: "translate(-50%, -50%)",
                        background: `radial-gradient(circle, rgba(225, 29, 72, ${heatmapOpacity / 100}) 0%, rgba(245, 158, 11, ${heatmapOpacity / 150}) 40%, transparent 70%)`,
                        mixBlendMode: "screen",
                      }}
                    />
                  )}

                  {showHeatmap && (
                    <div
                      className="absolute z-20 rounded-lg border-2 border-dashed border-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.5)] transition-all duration-500"
                      style={{
                        top: heatmapFocusPosition(analysis.key).top,
                        left: heatmapFocusPosition(analysis.key).left,
                        width: "100px",
                        height: "80px",
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <div className="absolute -top-7 left-0 flex items-center gap-1 rounded bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white shadow-lg">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span className="max-w-[220px] truncate">SCREENING: {analysis.mainFinding}</span>
                      </div>
                    </div>
                  )}

                  <div className="absolute left-6 top-6 z-30 rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-xl backdrop-blur-md">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-tighter text-indigo-400 underline decoration-indigo-500/50 underline-offset-4">
                      AI Clinical Filter
                    </p>
                    <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                      <Activity className="h-4 w-4 text-indigo-400" />
                      {analysis.partName}
                    </h2>
                    <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-indigo-200/90">가상 AI 판독</p>
                  </div>
                </div>

                <div className="flex flex-col items-stretch gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={`flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-black shadow-sm transition-all ${
                      showHeatmap
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {showHeatmap ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    AI 히트맵 {showHeatmap ? "활성화" : "비활성화"}
                  </button>
                  <div className="flex flex-1 items-center gap-4 border-slate-100 sm:border-l sm:pl-6">
                    <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="w-12 shrink-0 text-xs font-bold text-slate-500">투명도</span>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={Math.max(10, heatmapOpacity)}
                      onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
                      disabled={!showHeatmap}
                      className={`h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-100 accent-indigo-600 ${
                        !showHeatmap && "cursor-not-allowed opacity-50 grayscale"
                      }`}
                    />
                    <span className="w-8 shrink-0 text-right text-xs font-black text-indigo-600">
                      {Math.max(10, heatmapOpacity)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Imaging metrics</p>
                <div className="space-y-2">
                  {analysis.evidenceList.map((m, idx) => (
                    <div
                      key={`${m.name}-${idx}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm"
                    >
                      <span className="font-semibold text-slate-600">{m.name}</span>
                      <div className="text-right">
                        <span className="text-lg font-bold text-rose-600">
                          {m.value}
                          {m.unit}
                        </span>
                        <span className="block text-[10px] text-slate-400">참고 정상: {m.normal}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-auto rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
                <h3 className="mb-2 text-sm font-bold text-indigo-900">임상 교차 검증 (Cross-check)</h3>
                <p className="text-sm leading-relaxed text-indigo-800">
                  영상 기반{" "}
                  <strong className="font-extrabold text-indigo-900">{analysis.partName}</strong> 평가와{" "}
                  <strong className="text-rose-600">{analysis.mainFinding}</strong> 소견이 높은 연관성을 보입니다.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-5">
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    초기 재활 프로토콜 제안 (Care Guide)
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">부위별 템플릿을 기반으로 1주차 안전 프로토콜 초안을 생성했습니다.</p>
                </div>

                <div className="border-l-4 border-indigo-500 py-1 pl-4">
                  <h3 className="text-sm font-bold text-slate-800">1주차: 급성기 통증 조절 및 안정화</h3>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    {analysis.careGuides.map((item, index) => (
                      <div
                        key={`${item}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3"
                      >
                        <span>
                          {index + 1}. {item}
                        </span>
                        <span className="shrink-0 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-indigo-700 shadow-sm">
                          적용 권고
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                  <p className="mb-2 text-xs font-bold uppercase text-indigo-600">Expert evaluation</p>
                  <p className="text-sm font-medium leading-relaxed text-indigo-900">
                    {analysis.expertOpinion} (영상·ROM 등 정직한 데이터 기반 스크리닝)
                  </p>
                </div>
              </div>

              <div className="mt-8 space-y-4 border-t border-slate-100 pt-5">
                <h4 className="mb-2 text-xs font-bold text-slate-500">AI Care Guide 평가 및 SOAP 이관</h4>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleExport("reject")}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 py-3 text-rose-600 shadow-sm transition hover:bg-rose-100"
                  >
                    <span className="text-xl">👎</span>
                    <span className="text-[11px] font-bold">기각 (재평가)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport("modify")}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 py-3 text-amber-700 shadow-sm transition hover:bg-amber-100"
                  >
                    <span className="text-xl">✍️</span>
                    <span className="text-[11px] font-bold">수정 후 이관</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport("accept")}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 py-3 text-indigo-700 shadow-sm transition hover:bg-indigo-100"
                  >
                    <span className="text-xl">👍</span>
                    <span className="text-[11px] font-bold">그대로 이관</span>
                  </button>
                </div>
                <p className="mt-2 text-center text-[10px] leading-relaxed text-slate-400">
                  선택하신 피드백은 기존 SOAP 노트에 영향을 주지 않으며,
                  <br />
                  모델 고도화를 위한 학습 데이터로 분리 저장됩니다.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-2 animate-in fade-in zoom-in rounded-2xl border border-slate-700 bg-slate-900 p-8 text-white shadow-xl duration-700">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-indigo-500 p-2">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">통합 스크리닝 평가 (Clinical Correlation)</h2>
                <p className="text-xs text-slate-400">AI 영상 스크리닝과 치료사 임상 리포트를 한 화면에서 대조합니다.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                <p className="mb-2 text-xs font-bold uppercase text-slate-400">AI Analysis</p>
                <p className="text-sm font-semibold">{analysis.mainFinding}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-700">
                    <div className="h-full bg-rose-500" style={{ width: `${analysis.confidence}%` }} />
                  </div>
                  <span className="text-xs font-bold text-rose-400">{analysis.confidence}%</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                <p className="mb-2 text-xs font-bold uppercase text-slate-400">Clinical Report</p>
                <p className="text-sm font-semibold">{analysis.clinicalReportHeadline}</p>
                <div className="mt-2 text-[11px] text-slate-300">
                  {analysis.clinicalReportBullets.map((line, i) => (
                    <span key={i}>
                      {line}
                      <br />
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl border border-indigo-500/50 bg-indigo-600/20 p-4 text-center">
                <p className="mb-1 text-xs font-bold uppercase text-indigo-300">Correlation score</p>
                <h3 className="text-3xl font-black text-indigo-400">{analysis.correlationScore}%</h3>
                <p className="mt-1 text-[10px] text-indigo-200">임상 스크리닝과 영상 지표의 정합성이 높음</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinalizeSoap}
              className="group mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-indigo-600 py-4 font-bold text-white transition-all hover:bg-indigo-500"
            >
              <CheckCircle2 className="h-5 w-5" />
              통합 리포트 기반 최종 SOAP Care Guide 확정
              <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>

            <p className="mt-4 text-center text-[10px] text-slate-500">
              본 도구는 의사의 진단을 대체할 수 없는 보조 도구입니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
