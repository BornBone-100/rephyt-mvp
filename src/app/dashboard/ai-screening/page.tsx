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
  Image as ImageIcon,
} from "lucide-react";

export default function PreAssessmentScreening() {
  type AiResult = {
    finding: string;
    confidence: number;
    recommendation: string[];
  };

  // 1. 워크플로우 및 데이터 상태 관리
  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [aiResult, setAiResult] = useState<AiResult>({
    finding: "",
    confidence: 0,
    recommendation: [],
  });

  // 2. Grad-CAM(XAI) 인터랙티브 제어 상태 관리
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState(70);
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

  // AI 분석 API 요청 (실서버 연결 준비)
  const handleStartAnalysis = async () => {
    if (!selectedFile) {
      alert("영상을 먼저 업로드해 주세요.");
      return;
    }

    setStep(2);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      // TODO: 백엔드 분석 API 연결 시 아래 주석 해제 후 사용
      // const response = await fetch("/api/ai-screening/analyze", {
      //   method: "POST",
      //   body: formData,
      // });
      // const realData = await response.json();

      // 임시 시뮬레이션
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setAiResult({
        finding: selectedFile.name.toLowerCase().includes("shoulder")
          ? "견관절 기능 제한 소견"
          : "요추 L4-L5 기능 제한 소견",
        confidence: 88,
        recommendation: ["통증 없는 범위 내 관절 가동", "염증 완화 물리치료"],
      });
      setStep(3);
    } catch {
      alert("AI 분석 중 서버 오류가 발생했습니다.");
      setStep(1);
    }
  };

  // SOAP 노트 이관 시뮬레이션 (피드백 루프 포함)
  const handleExport = (feedbackType: string) => {
    const messages: Record<string, string> = {
      accept: "👍 AI 처방안이 그대로 SOAP 노트에 이관되었습니다. (학습 데이터: 긍정 기록)",
      modify: "✍️ 수정 모드로 전환합니다. 수정 후 SOAP 노트에 이관됩니다. (학습 데이터: 파인튜닝 기록)",
      reject: "👎 기각되었습니다. AI 모델 재학습 데이터로 전송됩니다.",
    };
    alert(messages[feedbackType]);
    // 실제 로직: DB 저장 및 라우팅 추가
  };

  const handleFinalizeSoap = () => {
    alert("통합 분석 결과가 최종 SOAP 노트로 이관되었습니다.");
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 text-slate-800 font-sans bg-slate-50 min-h-screen">
      {/* 헤더 영역 */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BrainCircuit className="w-7 h-7 text-indigo-600" />
          Re:PhyT AI - 사전 스크리닝 (Pre-Assessment)
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          환자 대면 전, 영상 데이터를 기반으로 정량적 평가(A)와 초기 처방(P)의 초안을 자동 생성합니다.
        </p>
      </div>

      {/* 진행 상태 바 */}
      <div className="flex items-center justify-between max-w-2xl mx-auto mb-8 px-4">
        {[
          { num: 1, label: "1. 데이터 업로드" },
          { num: 2, label: "2. 멀티모달 AI 분석" },
          { num: 3, label: "3. 결과 및 처방 확정" },
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

      {/* --- Step 1: 환자 대기실 & 접수 단계 (극도로 심플해진 입력) --- */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-indigo-500" /> 환자 데이터 업로드
          </h2>

          <div className="space-y-8">
            {/* 1. 영상 업로드 */}
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
              AI 스크리닝 시작하기
            </button>
          </div>
        </div>
      )}

      {/* --- Step 2: AI 분석 진행 중 (로딩) --- */}
      {step === 2 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-16 max-w-3xl mx-auto text-center animate-in fade-in duration-300">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-bold text-slate-800">의료 영상을 분석하고 있습니다</h2>
          <p className="text-sm text-slate-500 mt-2">
            영상 데이터를 교차 검증하여 해부학적 이상 소견을 탐색 중입니다...
          </p>
        </div>
      )}

      {/* --- Step 3: 결과 확인 및 처방 이관 (Grad-CAM + 피드백 루프) --- */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 좌측: 인터랙티브 Grad-CAM 시각적 분석 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5 flex flex-col">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  AI 분석 히트맵 (Grad-CAM)
                </h2>
                <span className="bg-rose-100 text-rose-800 text-xs px-2.5 py-1 rounded font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> 이상 소견 발견율 {aiResult.confidence}%
                </span>
              </div>

              {/* 영상 뷰어 영역 */}
              <div className="relative bg-slate-900 rounded-xl h-72 flex items-center justify-center overflow-hidden border border-slate-800 group shadow-inner">
                {previewUrl ? (
                  <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url(${previewUrl})` }} />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700">
                    <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                    <span className="text-sm font-bold opacity-50">영상 미리보기</span>
                  </div>
                )}

                {/* Grad-CAM 오버레이 */}
                {showHeatmap && (
                  <div
                    className="absolute inset-0 z-10 pointer-events-none mix-blend-screen transition-opacity duration-200"
                    style={{
                      opacity: heatmapOpacity / 100,
                      background:
                        "radial-gradient(circle at 50% 65%, rgba(225, 29, 72, 0.9) 0%, rgba(245, 158, 11, 0.6) 15%, rgba(0,0,0,0) 40%)",
                    }}
                  />
                )}

                {/* 타겟팅 박스 */}
                {showHeatmap && (
                  <div className="absolute top-[65%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-rose-500 rounded-lg z-20 shadow-[0_0_15px_rgba(225,29,72,0.5)]">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap shadow-sm">
                      {aiResult.finding || "분석 소견"}
                    </div>
                  </div>
                )}
              </div>

              {/* Grad-CAM 제어 콘솔 */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center gap-4">
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition w-32 ${
                  showHeatmap
                    ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                    : "bg-white text-slate-600 border border-slate-300"
                }`}
              >
                {showHeatmap ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                히트맵 {showHeatmap ? "ON" : "OFF"}
              </button>

              <div className="flex-1 flex items-center gap-3 border-l border-slate-300 pl-4">
                <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-600 w-12">투명도</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={heatmapOpacity}
                  onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
                  disabled={!showHeatmap}
                  className={`w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none ${
                    !showHeatmap && "opacity-50 grayscale cursor-not-allowed"
                  }`}
                />
                <span className="text-xs font-bold text-slate-600 w-8 text-right">{heatmapOpacity}%</span>
              </div>
              </div>

              <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 mt-auto">
                <h3 className="text-sm font-bold text-indigo-900 mb-2">임상 교차 검증 (Cross-check)</h3>
                <p className="text-sm text-indigo-800 leading-relaxed">
                  영상 내
                  <strong className="text-rose-600 font-bold"> {aiResult.finding || "기능 제한 소견"} </strong>
                  소견이 임상적으로 높은 연관성을 보입니다.
                </p>
              </div>
            </div>

            {/* 우측: 자동화된 처방 및 피드백 이관 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    초기 재활 프로토콜 제안 (P)
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    분석된 객관적 데이터를 기반으로 1주차 안전 프로토콜 초안을 생성했습니다.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="border-l-4 border-indigo-500 pl-4 py-1">
                    <h3 className="text-sm font-bold text-slate-800">1주차: 급성기 통증 조절 및 안정화</h3>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      {aiResult.recommendation.length > 0 ? (
                        aiResult.recommendation.map((item, index) => (
                          <div
                            key={`${item}-${index}`}
                            className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between items-center"
                          >
                            <span>{index + 1}. {item}</span>
                            <span className="text-xs font-bold text-indigo-700 bg-white px-2 py-1 rounded shadow-sm border border-slate-200">
                              적용 권고
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <span>분석 완료 후 개인화된 가이드가 표시됩니다.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 피드백 루프 (RLHF) 적용 버튼 영역 */}
              <div className="mt-8 border-t border-slate-100 pt-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-500 mb-2">AI 처방안 평가 및 SOAP 이관</h4>

                <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleExport("reject")}
                  className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 transition shadow-sm"
                >
                  <span className="text-xl">👎</span>
                  <span className="text-[11px] font-bold">기각 (재평가)</span>
                </button>

                <button
                  onClick={() => handleExport("modify")}
                  className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition shadow-sm"
                >
                  <span className="text-xl">✍️</span>
                  <span className="text-[11px] font-bold">수정 후 이관</span>
                </button>

                <button
                  onClick={() => handleExport("accept")}
                  className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition shadow-sm"
                >
                  <span className="text-xl">👍</span>
                  <span className="text-[11px] font-bold">그대로 이관</span>
                </button>
                </div>

                <p className="text-[10px] text-slate-400 text-center leading-relaxed mt-2">
                  선택하신 피드백은 기존 SOAP 노트에 영향을 주지 않으며,
                  <br />
                  정교한 AI 모델 고도화를 위한 학습 데이터로 분리 저장됩니다.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-2 bg-slate-900 text-white rounded-2xl p-8 shadow-xl border border-slate-700 animate-in fade-in zoom-in duration-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-500 rounded-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">통합 스크리닝 평가 결과 (Clinical Correlation)</h2>
                <p className="text-slate-400 text-xs">AI 영상 소견과 치료사 평가 리포트가 하나로 결합되었습니다.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <p className="text-xs text-slate-400 font-bold mb-2 uppercase">AI Analysis</p>
                <p className="text-sm font-semibold">{aiResult.finding || "영상 분석 소견 대기"}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500" style={{ width: `${aiResult.confidence}%` }} />
                  </div>
                  <span className="text-xs font-bold text-rose-400">{aiResult.confidence}%</span>
                </div>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <p className="text-xs text-slate-400 font-bold mb-2 uppercase">Clinical Report</p>
                <p className="text-sm font-semibold">요추 굴곡 시 방사통 양성</p>
                <div className="mt-2 text-[11px] text-slate-300">
                  • ROM: Flexion 40도 제한
                  <br />• SLR Test: Right 35도 양성
                </div>
              </div>

              <div className="bg-indigo-600/20 p-4 rounded-xl border border-indigo-500/50 flex flex-col justify-center items-center text-center">
                <p className="text-xs text-indigo-300 font-bold mb-1 uppercase">Correlation Score</p>
                <h3 className="text-3xl font-black text-indigo-400">96.5%</h3>
                <p className="text-[10px] text-indigo-200 mt-1">임상 증상과 영상 소견이 매우 일치함</p>
              </div>
            </div>

            <button
              onClick={handleFinalizeSoap}
              className="w-full mt-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 group"
            >
              <CheckCircle2 className="w-5 h-5" />
              통합 리포트 기반 최종 SOAP 처방 확정
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
