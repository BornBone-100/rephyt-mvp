"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Clipboard,
  CornerDownLeft,
  ClipboardPlus,
  Loader2,
  Mic,
  MicOff,
  Sparkles,
  User,
  WandSparkles,
} from "lucide-react";
import { createClient as createSupabaseClient } from "@/utils/supabase/client";
import MediaUploader from "@/components/MediaUploader";
import ConsentSignaturePad from "@/components/ConsentSignaturePad";
import ProgressChart from "@/components/ProgressChart";
import { getPatientProgress, type PatientProgressPoint } from "@/utils/supabase/analytics";

type PainType = "NRS" | "VAS";

type SfmaPattern =
  | "Cervical Flexion"
  | "Cervical Extension"
  | "Multi-segmental Flexion"
  | "Multi-segmental Extension"
  | "Multi-segmental Rotation"
  | "Single-leg Stance"
  | "Overhead Deep Squat";

type SfmaResult = "FN" | "FP" | "DN" | "DP";

type ParseVoiceResponse = {
  patient?: {
    chiefComplaint?: string | null;
    mechanismOfInjury?: string | null;
    onsetDate?: string | null;
  } | null;
  objective?: {
    painType?: PainType | null;
    painScore?: number | null;
    rom?: string | null;
    mmt?: string | null;
    specialTests?: string | null;
    clinicalTerminology?: string | null;
  } | null;
  assessment?: {
    clinicalHypotheses?: string[] | null;
    reasoning?: string[] | null;
  } | null;
  rcas?: {
    sfma?: Array<{ pattern: SfmaPattern; result: SfmaResult }> | null;
    mdt?: {
      painResponse?: "Centralization" | "Peripheralization" | null;
      directionalPreference?: string | null;
    } | null;
    msi?: { faults?: string[] | null } | null;
    janda?: {
      profile?: "" | "UCS" | "LCS" | "Layered" | "Other" | null;
      tonicTight?: string[] | null;
      phasicWeak?: string[] | null;
    } | null;
  } | null;
};

type FormState = {
  patient: {
    name: string;
    age: number | null;
    occupation: string;
    chiefComplaint: string;
    onsetDate: string; // YYYY-MM-DD
    mechanismOfInjury: string;
    pmhx: string;
  };
  objective: {
    painType: PainType;
    painScore: number; // 0~10
    rom: string;
    mmt: string;
    specialTests: string;
  };
  rcas: {
    sfma: Array<{ pattern: SfmaPattern; result: SfmaResult }>;
    mdt: {
      painResponse: "Centralization" | "Peripheralization";
      directionalPreference: string;
    };
    msi: {
      faults: string[];
    };
    janda: {
      profile: "" | "UCS" | "LCS" | "Layered" | "Other";
      tonicTight: string[];
      phasicWeak: string[];
    };
  };
  prompt: {
    systemPrompt: string;
  };
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const DRAFT_STORAGE_KEY = "rephyt-dashboard-draft-v1";
const DRAFT_SAVE_DEBOUNCE_MS = 400;

/** 모듈 스코프에 두어 렌더마다 타입이 바뀌지 않게 함(내부 정의 시 입력 필드가 매번 재마운트되어 끊김 유발) */
function DashboardCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      {children}
    </section>
  );
}

function DashboardSectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg border border-zinc-200 bg-white p-2 text-blue-800 shadow-sm">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold tracking-tight text-zinc-900">{title}</div>
        {subtitle ? <div className="mt-1 text-xs text-zinc-600">{subtitle}</div> : null}
      </div>
    </div>
  );
}

type SpeechRecognitionResultItem = {
  transcript: string;
};
type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: SpeechRecognitionResultItem;
};
type SpeechRecognitionEventLike = Event & {
  results: ArrayLike<SpeechRecognitionResultLike>;
  resultIndex: number;
};
type SpeechRecognitionLike = EventTarget & {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function useSpeechRecognition(
  lang = "ko-KR",
  onFinalTranscript?: (chunk: string) => void,
  onEnd?: () => void,
) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(onFinalTranscript);
  const onEndRef = useRef(onEnd);
  const processedFinalIndicesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    onFinalRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  const getCtor = () => {
    if (typeof window === "undefined") return null;
    return (
      (
        window as typeof window & {
          SpeechRecognition?: SpeechRecognitionCtor;
          webkitSpeechRecognition?: SpeechRecognitionCtor;
        }
      ).SpeechRecognition ||
      (
        window as typeof window & {
          SpeechRecognition?: SpeechRecognitionCtor;
          webkitSpeechRecognition?: SpeechRecognitionCtor;
        }
      ).webkitSpeechRecognition ||
      null
    );
  };

  const isSupported = getCtor() !== null;

  useEffect(() => {
    const maybeCtor = getCtor();
    if (!maybeCtor) {
      return;
    }

    const recognition = new maybeCtor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      const startIndex = typeof event.resultIndex === "number" ? event.resultIndex : 0;
      let interim = "";
      let appendedFinal = false;

      for (let i = startIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        const cleaned = transcript.trim();
        if (!cleaned) continue;

        if (result.isFinal) {
          // continuous 모드에서 onresult가 여러 번 호출될 때, 같은 final result를 중복 append 하지 않음
          if (!processedFinalIndicesRef.current.has(i)) {
            processedFinalIndicesRef.current.add(i);
            appendedFinal = true;
            onFinalRef.current?.(cleaned);
          }
        } else {
          interim = interim ? `${interim} ${cleaned}` : cleaned;
        }
      }

      // final이 append되면 interim은 초기화하는 편이 UX상 안정적
      if (appendedFinal) setInterimText("");
      else setInterimText(interim.trim());
    };

    recognition.onerror = (event) => {
      const mapped =
        event.error === "not-allowed"
          ? "마이크 권한이 허용되지 않았습니다. 브라우저 권한 설정을 확인해 주세요."
          : event.error === "no-speech"
            ? "음성이 감지되지 않았습니다. 다시 시도해 주세요."
            : "음성 인식 중 오류가 발생했습니다.";
      setError(mapped);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      onEndRef.current?.();
    };

    recognitionRef.current = recognition;
  }, [lang]);

  const start = () => {
    setError(null);
    processedFinalIndicesRef.current = new Set();
    setInterimText("");
    if (!recognitionRef.current) {
      setError("이 브라우저는 음성 인식을 지원하지 않습니다.");
      return;
    }
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      setError("마이크 시작에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const stop = () => {
    recognitionRef.current?.stop();
  };

  const reset = () => {
    setInterimText("");
    setError(null);
  };

  return { isSupported, isListening, interimText, error, start, stop, reset };
}

export default function Home() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const defaultSystemPrompt = useMemo(
    () =>
      [
        "역할(페르소나): 너는 근골격계(MSK) 및 신경계(Neurologic) 재활 임상 경험이 풍부한 전문 물리치료사(Physiotherapist)이자, EBP(Evidence-Based Practice) 문서화를 매우 잘한다.",
        "프레임워크: Re:PhyT 코어 평가 시스템(RCAS)을 통해 SFMA/MDT/MSI/Janda 프레임워크를 통합적으로 활용한다.",
        "철학: '데이터는 정직하고 케어는 전문 물리치료사와 함께 정교하게 실행한다'를 준수한다.",
        "",
        "핵심 규칙(중요):",
        "- 입력 JSON에 없는 사실을 추정/창작하지 않는다. 불명확/누락 정보는 '추가 확인 필요'로 명시한다.",
        "- 의학적 진단을 단정하지 않는다. 감별/가설은 가능성(probable/possible)로 표현한다.",
        "- 과도한 과장, 인사말, 서론을 금지한다. 결과만 출력한다.",
        "- 개인정보/민감정보를 불필요하게 반복하지 말고, 임상 문서에 필요한 최소만 포함한다.",
        "",
        "출력 형식(엄격):",
        "- 마크다운(Markdown) 텍스트만 출력한다. (JSON/코드블록/메타설명 금지)",
        "- 아래 SOAP 템플릿 헤더를 정확히 사용한다:",
        "  ## S (Subjective)",
        "  ## O (Objective)",
        "  ## A (Assessment)",
        "  ## P (Plan)",
        "",
        "[O] Objective 필수 라벨(정보 없으면 '추가 확인 필요'):",
        "  - ROM:",
        "  - MMT:",
        "  - Special Tests:",
        "  - SFMA:",
        "  - MDT:",
        "  - MSI:",
        "  - Janda:",
        "",
        "[P] Plan 필수 포함:",
        "- 'APPI Modified Pilates Level X'(X=1~4) 1회 이상 포함",
      ].join("\n"),
    [],
  );

  const initialState: FormState = useMemo(
    () => ({
      patient: {
        name: "",
        age: null,
        occupation: "",
        chiefComplaint: "",
        onsetDate: "",
        mechanismOfInjury: "",
        pmhx: "",
      },
      objective: {
        painType: "NRS",
        painScore: 3,
        rom: "",
        mmt: "",
        specialTests: "",
      },
      rcas: {
        sfma: [
          { pattern: "Cervical Flexion", result: "DN" },
          { pattern: "Multi-segmental Flexion", result: "DN" },
          { pattern: "Overhead Deep Squat", result: "DN" },
        ],
        mdt: {
          painResponse: "Centralization",
          directionalPreference: "Extension",
        },
        msi: {
          faults: [],
        },
        janda: {
          profile: "",
          tonicTight: [],
          phasicWeak: [],
        },
      },
      prompt: {
        systemPrompt: defaultSystemPrompt,
      },
    }),
    [defaultSystemPrompt],
  );

  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [soapMarkdown, setSoapMarkdown] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rawTranscript, setRawTranscript] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [uploadedMediaUrls, setUploadedMediaUrls] = useState<string[]>([]);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<PatientProgressPoint[]>([]);
  const [progressPatientId, setProgressPatientId] = useState("");

  const formRef = useRef(form);
  formRef.current = form;

  const rawTranscriptRef = useRef(rawTranscript);
  rawTranscriptRef.current = rawTranscript;
  const pendingAnalyzeRef = useRef(false);

  const speech = useSpeechRecognition(
    "ko-KR",
    (chunk) => {
      const cleaned = chunk.trim();
      if (!cleaned) return;
      // 누적은 useRef로 관리하고, 화면 표시용으로만 state를 업데이트한다.
      const prev = rawTranscriptRef.current.trim();
      const lastLine = prev ? prev.split("\n").pop()?.trim() : null;
      if (lastLine && lastLine === cleaned) return;

      const next = prev ? `${prev}\n${cleaned}` : cleaned;
      rawTranscriptRef.current = next;
      setRawTranscript(next);
    },
  );
  const {
    isSupported,
    isListening,
    interimText,
    error: speechError,
    start: startSpeech,
    stop: stopSpeech,
    reset: resetSpeech,
  } = speech;

  const canGenerate = form.patient.name.trim().length > 0;

  const pain = useMemo(() => {
    const score = clamp(form.objective.painScore, 0, 10);
    if (form.objective.painType === "NRS") {
      return { nrs: score };
    }
    // VAS: 입력은 0~10이지만 DB/API는 vasMm(0~100)를 기대할 수 있어 0~10 => mm로 변환
    return { vasMm: score * 10 };
  }, [form.objective.painScore, form.objective.painType]);

  const onGenerate = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSoapMarkdown("");

    try {
      const payload = {
        locale: "ko",
        systemPromptOverride: form.prompt.systemPrompt.trim() || undefined,
        patient: {
          name: form.patient.name.trim(),
          occupation: form.patient.occupation.trim() || undefined,
          chiefComplaint: form.patient.chiefComplaint.trim() || undefined,
          onsetDate: form.patient.onsetDate || undefined,
          mechanismOfInjury: form.patient.mechanismOfInjury.trim() || undefined,
          pmhx: form.patient.pmhx.trim() || undefined,
        },
        subjective: {
          // 현재 UI 요구사항 기준으로 “통증 + ADL 제한”을 최소 포함할 수 있게 구성
          // 필요하면 UI에 redFlags/ADL 제한 입력도 추가 가능
          pain: {
            ...pain,
          },
          history: undefined,
          goals: undefined,
          redFlags: undefined,
        },
        objective: {
          rom: form.objective.rom.trim() || undefined,
          mmt: form.objective.mmt.trim() || undefined,
          specialTests: form.objective.specialTests.trim() || undefined,
          rcas: {
            sfma: form.rcas.sfma,
            mdt: form.rcas.mdt,
            msi: form.rcas.msi,
            janda: form.rcas.janda,
          },
        },
        planDraft: {
          interventions: undefined,
          appiModifiedPilatesLevel: undefined,
          exercises: undefined,
          homework: undefined,
          nextSessionFocus: undefined,
          precautions: undefined,
        },
        // API 스키마에 직접 들어가진 않지만, 프롬프트 생성 품질을 위해 추가 정보 제공
        extra: {
          patientAge: form.patient.age,
        },
      };

      const res = await fetch("/api/generate-soap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const obj = data && typeof data === "object" ? (data as Record<string, unknown>) : null;

        const errorValue =
          obj && typeof obj.error === "string" ? obj.error : null;
        const messageValue =
          obj && typeof obj.message === "string" ? obj.message : null;
        const requestId =
          obj && typeof obj.requestId === "string" ? obj.requestId : null;

        // UI에는 "실제 원인(message)"을 우선 노출한다.
        const message = messageValue
          ? requestId
            ? `${messageValue} (requestId: ${requestId})`
            : messageValue
          : errorValue
            ? requestId
              ? `${errorValue} (requestId: ${requestId})`
              : errorValue
            : requestId
              ? `SOAP 생성 실패 (requestId: ${requestId})`
              : "SOAP 생성에 실패했습니다.";

        throw new Error(message);
      }

      const text = await res.text();
      setSoapMarkdown(text);
    } catch (e) {
      const message = e instanceof Error ? e.message : "알 수 없는 오류";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!speechError) return;
    setToast(speechError);
  }, [speechError]);

  const applyParsedDataToForm = useCallback(
    (prev: FormState, parsed: ParseVoiceResponse): FormState => {
      const next: FormState = { ...prev };

      if (parsed.patient) {
        if (typeof parsed.patient.chiefComplaint === "string") {
          next.patient = { ...next.patient, chiefComplaint: parsed.patient.chiefComplaint };
        }
        if (typeof parsed.patient.mechanismOfInjury === "string") {
          next.patient = {
            ...next.patient,
            mechanismOfInjury: parsed.patient.mechanismOfInjury,
          };
        }
        if (typeof parsed.patient.onsetDate === "string") {
          next.patient = { ...next.patient, onsetDate: parsed.patient.onsetDate };
        }
      }

      if (parsed.objective) {
        const objective = { ...next.objective };
        if (parsed.objective.painType === "NRS" || parsed.objective.painType === "VAS") {
          objective.painType = parsed.objective.painType;
        }
        if (typeof parsed.objective.painScore === "number") {
          objective.painScore = clamp(parsed.objective.painScore, 0, 10);
        }
        if (typeof parsed.objective.rom === "string") objective.rom = parsed.objective.rom;
        if (typeof parsed.objective.mmt === "string") objective.mmt = parsed.objective.mmt;
        if (typeof parsed.objective.specialTests === "string") {
          objective.specialTests = parsed.objective.specialTests;
        }
        if (
          typeof parsed.objective.clinicalTerminology === "string" &&
          parsed.objective.clinicalTerminology.trim()
        ) {
          const block = `[객관적 임상 용어 매핑]\n${parsed.objective.clinicalTerminology.trim()}`;
          objective.specialTests = objective.specialTests.trim()
            ? `${objective.specialTests.trim()}\n\n${block}`
            : block;
        }
        next.objective = objective;
      }

      if (parsed.assessment) {
        const hypo = parsed.assessment.clinicalHypotheses?.filter(Boolean) ?? [];
        const reasons = parsed.assessment.reasoning?.filter(Boolean) ?? [];
        if (hypo.length || reasons.length) {
          const lines: string[] = [];
          if (hypo.length) lines.push(`임상 가설: ${hypo.join(" | ")}`);
          if (reasons.length) lines.push(`근거: ${reasons.join(" ")}`);
          const block = `[음성 파싱·임상 추론]\n${lines.join("\n")}`;
          next.patient = {
            ...next.patient,
            pmhx: next.patient.pmhx.trim()
              ? `${next.patient.pmhx.trim()}\n\n${block}`
              : block,
          };
        }
      }

      if (parsed.rcas) {
        const rcas = { ...next.rcas };
        if (Array.isArray(parsed.rcas.sfma) && parsed.rcas.sfma.length > 0) {
          rcas.sfma = parsed.rcas.sfma;
        }
        if (parsed.rcas.mdt) {
          rcas.mdt = {
            painResponse:
              parsed.rcas.mdt.painResponse === "Centralization" ||
              parsed.rcas.mdt.painResponse === "Peripheralization"
                ? parsed.rcas.mdt.painResponse
                : rcas.mdt.painResponse,
            directionalPreference:
              typeof parsed.rcas.mdt.directionalPreference === "string"
                ? parsed.rcas.mdt.directionalPreference
                : rcas.mdt.directionalPreference,
          };
        }
        if (parsed.rcas.msi && Array.isArray(parsed.rcas.msi.faults)) {
          rcas.msi = { faults: parsed.rcas.msi.faults };
        }
        if (parsed.rcas.janda) {
          rcas.janda = {
            profile:
              parsed.rcas.janda.profile === "UCS" ||
              parsed.rcas.janda.profile === "LCS" ||
              parsed.rcas.janda.profile === "Layered" ||
              parsed.rcas.janda.profile === "Other" ||
              parsed.rcas.janda.profile === ""
                ? parsed.rcas.janda.profile
                : rcas.janda.profile,
            tonicTight: Array.isArray(parsed.rcas.janda.tonicTight)
              ? parsed.rcas.janda.tonicTight
              : rcas.janda.tonicTight,
            phasicWeak: Array.isArray(parsed.rcas.janda.phasicWeak)
              ? parsed.rcas.janda.phasicWeak
              : rcas.janda.phasicWeak,
          };
        }
        next.rcas = rcas;
      }

      return next;
    },
    [],
  );

  const parseVoiceAndGenerateSoap = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text) return false;

      const baseForm = formRef.current;
      if (!baseForm.patient.name.trim()) {
        setToast("먼저 환자 이름을 입력해 주세요.");
        return false;
      }

      setIsAnalyzing(true);
      setLoading(true);
      setErrorMsg(null);
      setSoapMarkdown("");
      setToast(null);

      try {
        // 1) 음성 -> RCAS/임상 추론 JSON
        const res = await fetch("/api/parse-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawText: text }),
        });

        const data = (await res.json().catch(() => null)) as
          | { parsed?: ParseVoiceResponse; error?: string; message?: string; requestId?: string }
          | null;

        if (!res.ok || !data?.parsed) {
          const message = data?.message || data?.error || "음성 분석에 실패했습니다.";
          throw new Error(message);
        }

        // 2) 폼 상태를 parsed 기반으로 동기 변환(바로 SOAP 생성에도 사용)
        const nextForm = applyParsedDataToForm(baseForm, data.parsed);
        setForm(nextForm);

        // 3) 폼 -> SOAP 생성
        const score = clamp(nextForm.objective.painScore, 0, 10);
        const pain =
          nextForm.objective.painType === "NRS" ? { nrs: score } : { vasMm: score * 10 };

        const payload = {
          locale: "ko",
          systemPromptOverride: nextForm.prompt.systemPrompt.trim() || undefined,
          patient: {
            name: nextForm.patient.name.trim(),
            occupation: nextForm.patient.occupation.trim() || undefined,
            chiefComplaint:
              nextForm.patient.chiefComplaint.trim() || undefined,
            onsetDate: nextForm.patient.onsetDate || undefined,
            mechanismOfInjury: nextForm.patient.mechanismOfInjury.trim() || undefined,
            pmhx: nextForm.patient.pmhx.trim() || undefined,
          },
          subjective: {
            pain: { ...pain },
            history: undefined,
            goals: undefined,
            redFlags: undefined,
          },
          objective: {
            rom: nextForm.objective.rom.trim() || undefined,
            mmt: nextForm.objective.mmt.trim() || undefined,
            specialTests: nextForm.objective.specialTests.trim() || undefined,
            rcas: {
              sfma: nextForm.rcas.sfma,
              mdt: nextForm.rcas.mdt,
              msi: nextForm.rcas.msi,
              janda: nextForm.rcas.janda,
            },
          },
          planDraft: {
            interventions: undefined,
            appiModifiedPilatesLevel: undefined,
            exercises: undefined,
            homework: undefined,
            nextSessionFocus: undefined,
            precautions: undefined,
          },
          extra: { patientAge: nextForm.patient.age },
        };

        const soapRes = await fetch("/api/generate-soap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!soapRes.ok) {
          const obj = await soapRes.json().catch(() => null);
          const record =
            obj && typeof obj === "object" ? (obj as Record<string, unknown>) : null;
          const errorValue = record && typeof record.error === "string" ? record.error : null;
          const messageValue =
            record && typeof record.message === "string" ? record.message : null;
          const requestId =
            record && typeof record.requestId === "string" ? record.requestId : null;

          const message = messageValue
            ? requestId
              ? `${messageValue} (requestId: ${requestId})`
              : messageValue
            : errorValue
              ? requestId
                ? `${errorValue} (requestId: ${requestId})`
                : errorValue
              : requestId
                ? `SOAP 생성 실패 (requestId: ${requestId})`
                : "SOAP 생성에 실패했습니다.";

          throw new Error(message);
        }

        const textOut = await soapRes.text();
        setSoapMarkdown(textOut);
        setToast("SOAP 노트가 생성되었습니다.");
        return true;
      } catch (e) {
        const message = e instanceof Error ? e.message : "음성→SOAP 파이프라인 오류";
        setErrorMsg(message);
        setToast(message);
        return false;
      } finally {
        setIsAnalyzing(false);
        setLoading(false);
      }
    },
    [applyParsedDataToForm],
  );

  const onCompleteAndAnalyze = async () => {
    if (isAnalyzing) return;
    const text = rawTranscriptRef.current.trim();
    if (!text) {
      setToast("먼저 환자의 상태를 음성으로 기록해 주세요.");
      pendingAnalyzeRef.current = false;
      return;
    }

    // 사용자가 "완료/분석 시작"을 누르면, 현재 녹음을 먼저 중지하고(isListening false),
    // stop이 끝난 뒤 1회만 분석이 실행되도록 pending 플래그를 사용합니다.
    pendingAnalyzeRef.current = true;
    if (isListening) {
      stopSpeech();
      return;
    }
    pendingAnalyzeRef.current = false;
    void parseVoiceAndGenerateSoap(text);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        form?: FormState;
        voiceDraft?: string; // backward compatible
        rawTranscript?: string;
      };
      if (parsed.form) setForm(parsed.form);
      const rt = typeof parsed.rawTranscript === "string"
        ? parsed.rawTranscript
        : typeof parsed.voiceDraft === "string"
          ? parsed.voiceDraft
          : "";
      if (rt) setRawTranscript(rt);
      setToast("이전에 저장된 세션 초안을 불러왔습니다.");
    } catch {
      // ignore invalid localStorage payload
    }
  }, []);

  const draftPersistRef = useRef({ form, rawTranscript: "" });
  draftPersistRef.current = { form, rawTranscript };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify(draftPersistRef.current),
        );
      } catch {
        // quota / private mode
      }
    }, DRAFT_SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [form, rawTranscript]);

  useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify(draftPersistRef.current),
        );
      } catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isListening) return;
    if (!pendingAnalyzeRef.current) return;

    pendingAnalyzeRef.current = false;
    const text = rawTranscriptRef.current.trim();
    if (!text) return;
    void parseVoiceAndGenerateSoap(text);
  }, [isListening, parseVoiceAndGenerateSoap]);

  const onLogout = async () => {
    setLogoutLoading(true);
    const { error } = await supabase.auth.signOut();
    setLogoutLoading(false);
    if (error) {
      setToast(error.message);
      return;
    }
    router.replace("/login");
  };

  const loadProgress = async () => {
    if (!progressPatientId.trim()) {
      setProgressData([]);
      setProgressError("환자 ID를 입력한 뒤 경과 통계를 조회해 주세요.");
      return;
    }

    setProgressLoading(true);
    setProgressError(null);
    try {
      const data = await getPatientProgress(progressPatientId.trim());
      setProgressData(data);
    } catch (e) {
      setProgressError(e instanceof Error ? e.message : "경과 데이터 조회 오류");
      setProgressData([]);
    } finally {
      setProgressLoading(false);
    }
  };

  const onToggleProgress = async () => {
    const next = !isProgressOpen;
    setIsProgressOpen(next);
    if (!next) return;
    await loadProgress();
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto w-full max-w-6xl px-4 py-10 lg:px-8 lg:py-14">
        {toast ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle size={16} />
            <span>{toast}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-auto text-xs font-medium text-amber-700 hover:text-amber-900"
            >
              닫기
            </button>
          </div>
        ) : null}

        <header className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
                  <span className="block text-3xl font-semibold tracking-tight text-blue-900">
                    Re:PhyT
                  </span>
                </div>
                <div className="hidden h-10 w-px bg-zinc-200 sm:block" />
              </div>
              <p className="text-sm text-zinc-600">
                데이터는 정직하고 케어는 전문 물리치료사와 함께 정교하게 실행합니다
              </p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              disabled={logoutLoading}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {logoutLoading ? "로그아웃 중..." : "로그아웃"}
            </button>
          </div>
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsConsentModalOpen(true)}
                className="inline-flex h-9 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-900 hover:bg-blue-100"
              >
                📝 환자 동의서 받기
              </button>
              <button
                type="button"
                onClick={onToggleProgress}
                className="inline-flex h-9 items-center rounded-lg border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-teal-900 hover:bg-teal-100"
              >
                📈 환자 경과 통계 보기
              </button>
            </div>
          </div>
          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              isProgressOpen ? "mt-4 max-h-[560px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="rounded-xl border border-zinc-200 bg-white p-3">
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-[240px] flex-1">
                  <div className="text-[11px] font-medium text-zinc-700">환자 ID (UUID)</div>
                  <input
                    value={progressPatientId}
                    onChange={(e) => setProgressPatientId(e.target.value)}
                    placeholder="예: 123e4567-e89b-12d3-a456-426614174000"
                    className="mt-1 h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-xs outline-none focus:border-teal-500/40 focus:ring-2 focus:ring-teal-500/10"
                  />
                </label>
                <button
                  type="button"
                  onClick={loadProgress}
                  className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  새로고침
                </button>
              </div>

              <div className="mt-3">
                {progressLoading ? (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-600">
                    경과 데이터를 불러오는 중...
                  </div>
                ) : progressError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                    {progressError}
                  </div>
                ) : progressData.length === 0 ? (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-600">
                    아직 충분한 차트 데이터가 모이지 않았습니다.
                  </div>
                ) : (
                  <ProgressChart data={progressData} />
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Section 1 */}
          <DashboardCard>
            <DashboardSectionHeader
              icon={<User size={18} />}
              title="환자 기본 및 임상 정보"
              subtitle="이름/나이/직업 + 주 호소와 발병 정보"
            />
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <div className="text-xs font-medium text-zinc-700">이름</div>
                <input
                  value={form.patient.name}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      patient: { ...prev.patient, name: e.target.value },
                    }))
                  }
                  placeholder="예: 김철수"
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-blue-900/40 focus:ring-2 focus:ring-blue-900/10"
                />
              </label>

              <label className="space-y-2">
                <div className="text-xs font-medium text-zinc-700">나이</div>
                <input
                  type="number"
                  min={0}
                  max={130}
                  value={form.patient.age ?? ""}
                  onChange={(e) => {
                    const v = e.target.value === "" ? null : Number(e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      patient: { ...prev.patient, age: v == null ? null : clamp(v, 0, 130) },
                    }));
                  }}
                  placeholder="예: 34"
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-blue-900/40 focus:ring-2 focus:ring-blue-900/10"
                />
              </label>

              <label className="space-y-2 sm:col-span-2">
                <div className="text-xs font-medium text-zinc-700">직업</div>
                <input
                  value={form.patient.occupation}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      patient: { ...prev.patient, occupation: e.target.value },
                    }))
                  }
                  placeholder="예: 간호사 / 사무직"
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-blue-900/40 focus:ring-2 focus:ring-blue-900/10"
                />
              </label>

              <label className="space-y-2 sm:col-span-2">
                <div className="text-xs font-medium text-zinc-700">주 호소 (Chief Complaint)</div>
                <input
                  value={form.patient.chiefComplaint}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      patient: { ...prev.patient, chiefComplaint: e.target.value },
                    }))
                  }
                  placeholder="예: 우측 어깨 전면 통증, 팔 들 때 악화"
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-blue-900/40 focus:ring-2 focus:ring-blue-900/10"
                />
              </label>

              <label className="space-y-2">
                <div className="text-xs font-medium text-zinc-700">발병일 (Onset Date)</div>
                <input
                  type="date"
                  value={form.patient.onsetDate}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      patient: { ...prev.patient, onsetDate: e.target.value },
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-blue-900/40 focus:ring-2 focus:ring-blue-900/10"
                />
              </label>

              <label className="space-y-2">
                <div className="text-xs font-medium text-zinc-700">손상 기전 (MOI)</div>
                <input
                  value={form.patient.mechanismOfInjury}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      patient: { ...prev.patient, mechanismOfInjury: e.target.value },
                    }))
                  }
                  placeholder="예: 낙상, 과사용, 스포츠 중"
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-blue-900/40 focus:ring-2 focus:ring-blue-900/10"
                />
              </label>

              <label className="space-y-2 sm:col-span-2">
                <div className="text-xs font-medium text-zinc-700">과거 병력 (PMHx, 간단)</div>
                <input
                  value={form.patient.pmhx}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      patient: { ...prev.patient, pmhx: e.target.value },
                    }))
                  }
                  placeholder="예: 디스크 수술, 고혈압 등(선택)"
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-blue-900/40 focus:ring-2 focus:ring-blue-900/10"
                />
              </label>
            </div>
          </DashboardCard>

          {/* Section 2 */}
          <DashboardCard>
            <DashboardSectionHeader
              icon={<ClipboardPlus size={18} />}
              title="이학적 검사 및 통증 평가"
              subtitle="ROM/MMT/Special Tests + VAS/NRS"
            />

            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-medium text-zinc-700">
                    통증 스케일 ({form.objective.painType})
                  </div>
                  <div className="text-xs text-zinc-600">현재: {form.objective.painScore}/10</div>
                </div>

                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, objective: { ...prev.objective, painType: "VAS" } }))}
                    className={`h-9 rounded-xl border px-3 text-xs font-medium transition ${
                      form.objective.painType === "VAS"
                        ? "border-blue-900 bg-blue-900/10 text-blue-900"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    VAS
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, objective: { ...prev.objective, painType: "NRS" } }))}
                    className={`h-9 rounded-xl border px-3 text-xs font-medium transition ${
                      form.objective.painType === "NRS"
                        ? "border-blue-900 bg-blue-900/10 text-blue-900"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    NRS
                  </button>
                </div>

                <div className="mt-4">
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={form.objective.painScore}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        objective: { ...prev.objective, painScore: clamp(Number(e.target.value), 0, 10) },
                      }))
                    }
                    className="w-full accent-blue-900"
                  />
                  <div className="mt-2 flex justify-between text-[11px] text-zinc-500">
                    <span>0</span>
                    <span>5</span>
                    <span>10</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <div className="text-xs font-medium text-zinc-700">ROM</div>
                  <textarea
                    value={form.objective.rom}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        objective: { ...prev.objective, rom: e.target.value },
                      }))
                    }
                    placeholder="예: flex 120°, ext 20°, ABD 제한 등"
                    className="min-h-[94px] w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-900/40 focus:ring-2 focus:ring-blue-900/10"
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-xs font-medium text-zinc-700">MMT</div>
                  <textarea
                    value={form.objective.mmt}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        objective: { ...prev.objective, mmt: e.target.value },
                      }))
                    }
                    placeholder="예: shoulder ER 4/5, scapular setting 용이/어려움 등"
                    className="min-h-[94px] w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-900/40 focus:ring-2 focus:ring-blue-900/10"
                  />
                </label>

                <label className="space-y-2 sm:col-span-2">
                  <div className="text-xs font-medium text-zinc-700">Special Tests</div>
                  <textarea
                    value={form.objective.specialTests}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        objective: { ...prev.objective, specialTests: e.target.value },
                      }))
                    }
                    placeholder="예: impingement test+, neural tension+, instability sign 등"
                    className="min-h-[94px] w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-900/40 focus:ring-2 focus:ring-blue-900/10"
                  />
                </label>
              </div>
            </div>
          </DashboardCard>

          {/* Section 2: RCAS */}
          <DashboardCard>
            <DashboardSectionHeader
              icon={<Clipboard size={18} />}
              title="Re:PhyT 코어 평가 시스템 (RCAS)"
              subtitle="SFMA · MDT · MSI · Janda 통합 평가"
            />

            <div className="mt-5 grid grid-cols-1 gap-4">
              {/* 2-1 SFMA */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <div className="text-sm font-semibold text-zinc-900">
                  2-1) 움직임 패턴 평가 (SFMA)
                </div>
                <div className="mt-1 text-xs text-zinc-600">
                  주요 패턴 선택 + 결과(FN/FP/DN/DP)
                </div>

                <div className="mt-4 space-y-3">
                  {form.rcas.sfma.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <select
                        value={row.pattern}
                        onChange={(e) =>
                          setForm((prev) => {
                            const next = [...prev.rcas.sfma];
                            next[idx] = {
                              ...next[idx],
                              pattern: e.target.value as SfmaPattern,
                            };
                            return { ...prev, rcas: { ...prev.rcas, sfma: next } };
                          })
                        }
                        className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-blue-900/40 focus:ring-2 focus:ring-blue-900/10"
                      >
                        {(
                          [
                            "Cervical Flexion",
                            "Cervical Extension",
                            "Multi-segmental Flexion",
                            "Multi-segmental Extension",
                            "Multi-segmental Rotation",
                            "Single-leg Stance",
                            "Overhead Deep Squat",
                          ] as const
                        ).map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>

                      <select
                        value={row.result}
                        onChange={(e) =>
                          setForm((prev) => {
                            const next = [...prev.rcas.sfma];
                            next[idx] = {
                              ...next[idx],
                              result: e.target.value as SfmaResult,
                            };
                            return { ...prev, rcas: { ...prev.rcas, sfma: next } };
                          })
                        }
                        className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-blue-900/40 focus:ring-2 focus:ring-blue-900/10"
                      >
                        {(["FN", "FP", "DN", "DP"] as const).map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => {
                            const next = prev.rcas.sfma.filter((_, i) => i !== idx);
                            return { ...prev, rcas: { ...prev.rcas, sfma: next } };
                          })
                        }
                        className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-50"
                      >
                        제거
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        rcas: {
                          ...prev.rcas,
                          sfma: [...prev.rcas.sfma, { pattern: "Overhead Deep Squat", result: "DN" }],
                        },
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
                  >
                    패턴 추가
                  </button>
                </div>
              </div>

              {/* 2-2 MDT */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <div className="text-sm font-semibold text-zinc-900">
                  2-2) 척추 역학 및 방향성 평가 (MDT)
                </div>
                <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="text-xs font-medium text-zinc-700">통증 양상</div>
                    <div className="mt-3 grid min-w-0 grid-cols-1 gap-2">
                      {(
                        [
                          { id: "Centralization", label: "Centralization" },
                          { id: "Peripheralization", label: "Peripheralization" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              rcas: {
                                ...prev.rcas,
                                mdt: { ...prev.rcas.mdt, painResponse: opt.id },
                              },
                            }))
                          }
                          className={`h-auto min-h-9 w-full min-w-0 rounded-xl border px-2 py-2 text-center text-[11px] font-medium leading-tight transition sm:text-xs ${
                            form.rcas.mdt.painResponse === opt.id
                              ? "border-blue-900 bg-blue-900/10 text-blue-900"
                              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="min-w-0 space-y-2">
                    <div className="text-xs font-medium text-zinc-700">
                      방향적 선호도 (Directional Preference)
                    </div>
                    <select
                      value={form.rcas.mdt.directionalPreference}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          rcas: {
                            ...prev.rcas,
                            mdt: { ...prev.rcas.mdt, directionalPreference: e.target.value },
                          },
                        }))
                      }
                      className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-blue-900/40 focus:ring-2 focus:ring-blue-900/10"
                    >
                      {["Flexion", "Extension", "Lateral Glide", "Rotation", "Other"].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {/* 2-3 MSI */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <div className="text-sm font-semibold text-zinc-900">
                  2-3) 운동 손상 및 역학적 결함 (MSI)
                </div>
                <div className="mt-1 text-xs text-zinc-600">
                  대표적 결함을 체크하세요 (예시는 추후 DB/템플릿으로 확장)
                </div>

                {(
                  [
                    "고관절 굴곡 시 요추 보상 증가",
                    "스쿼트 시 무릎 내측 붕괴(dynamic valgus)",
                    "팔 들기 시 견갑 상방회전 부족/상승 과다",
                    "힙 힌지 시 요추 굴곡 우세",
                    "런지 시 전방 경사/요추 과신전",
                  ] as const
                ).map((item) => {
                  const checked = form.rcas.msi.faults.includes(item);
                  return (
                    <label key={item} className="mt-3 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setForm((prev) => {
                            const faults = new Set(prev.rcas.msi.faults);
                            if (e.target.checked) faults.add(item);
                            else faults.delete(item);
                            return {
                              ...prev,
                              rcas: {
                                ...prev.rcas,
                                msi: { faults: Array.from(faults) },
                              },
                            };
                          })
                        }
                        className="h-4 w-4 accent-blue-900"
                      />
                      <span className="text-sm text-zinc-800">{item}</span>
                    </label>
                  );
                })}
              </div>

              {/* 2-4 Janda */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <div className="text-sm font-semibold text-zinc-900">
                  2-4) 자세 및 근육 불균형 프로파일링 (Janda)
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <div className="text-xs font-medium text-zinc-700">체형 분류</div>
                    <select
                      value={form.rcas.janda.profile}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          rcas: {
                            ...prev.rcas,
                            janda: { ...prev.rcas.janda, profile: e.target.value as FormState["rcas"]["janda"]["profile"] },
                          },
                        }))
                      }
                      className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-blue-900/40 focus:ring-2 focus:ring-blue-900/10"
                    >
                      <option value="">선택</option>
                      <option value="UCS">UCS (Upper Crossed Syndrome)</option>
                      <option value="LCS">LCS (Lower Crossed Syndrome)</option>
                      <option value="Layered">Layered Syndrome</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="text-xs font-medium text-zinc-700">근육 프로파일</div>
                    <div className="mt-2 text-[11px] text-zinc-500">
                      Tonic(타이트) / Phasic(약화) 체크
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold text-zinc-700">Tonic (tight)</div>
                    {(["Upper trap/levator", "Pec minor", "Hip flexors", "Thoracolumbar extensors"] as const).map(
                      (m) => {
                        const checked = form.rcas.janda.tonicTight.includes(m);
                        return (
                          <label key={m} className="mt-2 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setForm((prev) => {
                                  const next = new Set(prev.rcas.janda.tonicTight);
                                  if (e.target.checked) next.add(m);
                                  else next.delete(m);
                                  return {
                                    ...prev,
                                    rcas: {
                                      ...prev.rcas,
                                      janda: { ...prev.rcas.janda, tonicTight: Array.from(next) },
                                    },
                                  };
                                })
                              }
                              className="h-4 w-4 accent-blue-900"
                            />
                            <span className="text-sm text-zinc-800">{m}</span>
                          </label>
                        );
                      },
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-zinc-700">Phasic (weak)</div>
                    {(["Deep neck flexors", "Lower trap/serratus", "Glute max/med", "Abdominals"] as const).map((m) => {
                      const checked = form.rcas.janda.phasicWeak.includes(m);
                      return (
                        <label key={m} className="mt-2 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setForm((prev) => {
                                const next = new Set(prev.rcas.janda.phasicWeak);
                                if (e.target.checked) next.add(m);
                                else next.delete(m);
                                return {
                                  ...prev,
                                  rcas: {
                                    ...prev.rcas,
                                    janda: { ...prev.rcas.janda, phasicWeak: Array.from(next) },
                                  },
                                };
                              })
                            }
                            className="h-4 w-4 accent-blue-900"
                          />
                          <span className="text-sm text-zinc-800">{m}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </DashboardCard>

          {/* Section 4 */}
          <DashboardCard>
            <DashboardSectionHeader
              icon={<WandSparkles size={18} />}
              title="EBP 기반 SOAP 노트 자동 생성"
              subtitle="치료사가 입력한 평가 데이터를 정직하게 조합합니다"
            />

            <div className="mt-5 space-y-4">
              <button
                type="button"
                onClick={onGenerate}
                disabled={!canGenerate || loading || isAnalyzing}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CornerDownLeft size={16} className="opacity-90" />
                {loading ? "생성 중..." : "EBP 기반 SOAP 노트 생성"}
              </button>

              {errorMsg ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMsg}
                </div>
              ) : null}

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-zinc-700">
                    결과 출력 박스 (Markdown)
                  </div>
                  <div className="text-xs text-zinc-500">자동 생성</div>
                </div>

                <div
                  className="mt-3 max-h-[520px] overflow-auto rounded-xl bg-white p-4 text-sm text-zinc-800"
                  aria-live="polite"
                >
                  {soapMarkdown ? (
                    <pre className="whitespace-pre-wrap break-words font-sans">{soapMarkdown}</pre>
                  ) : (
                    <div className="text-sm text-zinc-500">
                      버튼을 누르면 SOAP 노트가 여기에 표시됩니다.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4">
                <div className="mt-0.5 rounded-lg bg-blue-900/10 p-2 text-blue-900">
                  <Clipboard size={18} />
                </div>
                <div>
                  <div className="text-sm font-medium text-zinc-900">권장 입력</div>
                  <div className="mt-1 text-xs text-zinc-600">
                    Objective의 ROM/MMT/Special Tests와 RCAS(SFMA/MDT/MSI/Janda) 입력을 주면 SOAP의 품질이 올라갑니다.
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="text-xs font-semibold text-zinc-700">System Prompt (편집 가능)</div>
                <div className="mt-1 text-[11px] text-zinc-500">
                  현재 적용 프롬프트를 수정해 품질을 튜닝할 수 있습니다.
                </div>
                <textarea
                  value={form.prompt.systemPrompt}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      prompt: { systemPrompt: e.target.value },
                    }))
                  }
                  className="mt-3 min-h-[180px] w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs leading-5 text-zinc-800 outline-none focus:border-blue-900/40 focus:ring-2 focus:ring-blue-900/10"
                />
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-zinc-700">
                    방금 하신 말씀
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {isListening ? "녹음 중..." : "대기"}
                  </div>
                </div>
                {interimText ? (
                  <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                    실시간 전사: {interimText}
                  </div>
                ) : null}
                <textarea
                  value={rawTranscript}
                  onChange={(e) => {
                    const v = e.target.value;
                    rawTranscriptRef.current = v;
                    setRawTranscript(v);
                  }}
                  placeholder="녹음 결과가 여기에 누적됩니다. 필요하면 직접 수정할 수 있어요."
                  className="mt-3 min-h-[120px] max-h-[240px] w-full resize-none overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-blue-900/40 focus:ring-2 focus:ring-blue-900/10"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {/* 버튼 1: 마이크 토글 */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isSupported) {
                        setToast("이 브라우저는 SpeechRecognition(Web Speech API)을 지원하지 않습니다.");
                        return;
                      }
                      if (isAnalyzing) return;
                      if (isListening) {
                        stopSpeech();
                        return;
                      }
                      // 새 녹음 시작: 중복/누적 버그 방지를 위해 텍스트를 초기화
                      pendingAnalyzeRef.current = false;
                      rawTranscriptRef.current = "";
                      setRawTranscript("");
                      resetSpeech();
                      startSpeech();
                    }}
                    disabled={isAnalyzing}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                    {isListening ? "마이크 끄기" : "마이크 켜기"}
                  </button>

                  <button
                    type="button"
                    onClick={onCompleteAndAnalyze}
                    disabled={isAnalyzing}
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    {isAnalyzing ? "처리 중..." : "AI 분석 및 SOAP 생성"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
                      }
                      rawTranscriptRef.current = "";
                      setRawTranscript("");
                      resetSpeech();
                      setToast("임시 텍스트를 초기화했습니다.");
                    }}
                    disabled={isAnalyzing}
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    초기화
                  </button>
                </div>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard>
            <DashboardSectionHeader
              icon={<Clipboard size={18} />}
              title="시각적 임상 자료 첨부"
              subtitle="Janda 체형 분석, 초음파 영상 등"
            />
            <div className="mt-5 space-y-3">
              <div className="text-xs text-zinc-600">
                시각적 임상 자료 첨부 (Janda 체형 분석, 초음파 영상 등)
              </div>
              <MediaUploader
                onUploaded={(url) =>
                  setUploadedMediaUrls((prev) => [url, ...prev])
                }
              />
              {uploadedMediaUrls.length > 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="text-xs font-semibold text-zinc-700">업로드된 미디어 URL</div>
                  <div className="mt-2 space-y-2">
                    {uploadedMediaUrls.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-xs text-blue-700 underline"
                      >
                        {url}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </DashboardCard>
        </div>
      </main>

      {isConsentModalOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-zinc-900">환자 전자 동의서</div>
                <div className="text-xs text-zinc-600">
                  민감정보 수집 및 AI 분석 활용 동의
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConsentModalOpen(false)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
              >
                닫기
              </button>
            </div>

            <ConsentSignaturePad
              onCancel={() => setIsConsentModalOpen(false)}
              onSaved={() => {
                setIsConsentModalOpen(false);
                setToast("동의가 완료되었습니다");
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
