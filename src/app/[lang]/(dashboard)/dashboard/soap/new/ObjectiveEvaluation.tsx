"use client";

import { useEffect, useMemo, useState } from "react";
import type { SoapLocale } from "./soap-copy";

const END_FEEL_OPTIONS = ["Normal", "Hard", "Soft", "Firm", "Empty"] as const;
const MMT_OPTIONS = ["5", "4+", "4", "4-", "3+", "3", "3-", "2", "1", "0"] as const;

export type RomMmtInput = {
  arom: string;
  prom: string;
  endFeel: string;
  mmt: string;
};

export type Side = "left" | "right";
export type RomMmtBySide = Record<Side, RomMmtInput>;
type SideMode = "left" | "right" | "bilateral" | "none";
type RegionKey = "neck" | "shoulder" | "elbow" | "wrist" | "hand" | "lumbar" | "hip" | "knee" | "ankle" | "foot";

const EXTREMITY_PARTS = new Set<RegionKey>(["shoulder", "elbow", "wrist", "hand", "hip", "knee", "ankle", "foot"]);
const REGION_LABEL_MAP: Record<RegionKey, string> = {
  neck: "경추",
  shoulder: "어깨",
  elbow: "팔꿈치",
  wrist: "손목",
  hand: "손목",
  lumbar: "요추",
  hip: "고관절",
  knee: "무릎",
  ankle: "발목",
  foot: "발목",
};

const MOVEMENT_MAP: Record<RegionKey, string[]> = {
  neck: [
    "굴곡 (Flexion)",
    "신전 (Extension)",
    "좌측굴 (Side Bending L)",
    "우측굴 (Side Bending R)",
    "좌회전 (Rotation L)",
    "우회전 (Rotation R)",
  ],
  lumbar: [
    "굴곡 (Flexion)",
    "신전 (Extension)",
    "좌측굴 (Side Bending L)",
    "우측굴 (Side Bending R)",
    "좌회전 (Rotation L)",
    "우회전 (Rotation R)",
  ],
  shoulder: [
    "굴곡 (Flexion)",
    "신전 (Extension)",
    "외전 (Abduction)",
    "내전 (Adduction)",
    "내회전 (Internal Rotation)",
    "외회전 (External Rotation)",
  ],
  elbow: ["굴곡 (Flexion)", "신전 (Extension)", "회내 (Pronation)", "회외 (Supination)"],
  wrist: [
    "굴곡 (Palmar Flexion)",
    "신전 (Dorsi Flexion)",
    "요측 편위 (Radial Deviation)",
    "척측 편위 (Ulnar Deviation)",
  ],
  hand: [
    "굴곡 (Palmar Flexion)",
    "신전 (Dorsi Flexion)",
    "요측 편위 (Radial Deviation)",
    "척측 편위 (Ulnar Deviation)",
  ],
  hip: [
    "굴곡 (Flexion)",
    "신전 (Extension)",
    "외전 (Abduction)",
    "내전 (Adduction)",
    "내회전 (Internal Rotation)",
    "외회전 (External Rotation)",
  ],
  knee: ["굴곡 (Flexion)", "신전 (Extension)"],
  ankle: [
    "배측굴곡 (Dorsiflexion)",
    "저측굴곡 (Plantarflexion)",
    "내번 (Inversion)",
    "외번 (Eversion)",
  ],
  foot: [
    "배측굴곡 (Dorsiflexion)",
    "저측굴곡 (Plantarflexion)",
    "내번 (Inversion)",
    "외번 (Eversion)",
  ],
};

const DEFAULT_ROW: RomMmtInput = { arom: "", prom: "", endFeel: "Normal", mmt: "" };

function emptySide(): RomMmtInput {
  return { ...DEFAULT_ROW };
}

function mergeRow(row: RomMmtBySide | undefined): RomMmtBySide {
  return {
    left: { ...DEFAULT_ROW, ...(row?.left ?? {}) },
    right: { ...DEFAULT_ROW, ...(row?.right ?? {}) },
  };
}

export function isSagittalNoLrMovement(_movementName: string): boolean {
  return false;
}

export function formatRomMmtLineForEvaluation(movement: string, row: RomMmtBySide, tagRomMmt: string): string {
  const { left, right } = mergeRow(row);
  const hasRight = Boolean(right.arom || right.prom || right.mmt || right.endFeel !== "Normal");
  if (!hasRight) {
    return `${tagRomMmt} ${movement} | AROM: ${left.arom || "-"} | PROM: ${left.prom || "-"} | End Feel: ${left.endFeel || "-"} | MMT: ${left.mmt || "-"}`;
  }
  return `${tagRomMmt} ${movement} | L-AROM: ${left.arom || "-"} | L-PROM: ${left.prom || "-"} | L-End Feel: ${left.endFeel || "-"} | L-MMT: ${left.mmt || "-"} | R-AROM: ${right.arom || "-"} | R-PROM: ${right.prom || "-"} | R-End Feel: ${right.endFeel || "-"} | R-MMT: ${right.mmt || "-"}`;
}

export function romMmtRowHasAnyData(_movement: string, row: RomMmtBySide | undefined): boolean {
  const { left, right } = mergeRow(row);
  return Boolean(
    left.arom || left.prom || left.mmt || left.endFeel !== "Normal" ||
      right.arom || right.prom || right.mmt || right.endFeel !== "Normal",
  );
}

type Props = {
  movements: string[];
  romMmtInputs: Record<string, RomMmtBySide>;
  onPatchSide: (movement: string, side: Side, patch: Partial<RomMmtInput>) => void;
  onReplaceMovementRow: (movement: string, next: RomMmtBySide) => void;
  locale: SoapLocale;
  selectedDiagnosisArea: string;
  onAssessmentMetaChange?: (meta: {
    bodyPart: string;
    sideMode: "left" | "right" | "bilateral" | "none";
    motions: string[];
    data: Record<string, RomMmtBySide>;
  }) => void;
};

function resolveRegionKey(raw: string): RegionKey | null {
  const key = raw.trim().split(" ")[0].toLowerCase();
  if (!key) return null;
  return key in MOVEMENT_MAP ? (key as RegionKey) : null;
}

function RomFields({
  value,
  onChange,
  endFeelTooltip,
}: {
  value: RomMmtInput;
  onChange: (patch: Partial<RomMmtInput>) => void;
  endFeelTooltip: string[];
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
      <input
        value={value.arom}
        onChange={(e) => onChange({ arom: e.target.value })}
        placeholder="AROM"
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
      <input
        value={value.prom}
        onChange={(e) => onChange({ prom: e.target.value })}
        placeholder="PROM"
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
      <div className="group relative min-w-0">
        <select
          value={value.endFeel}
          onChange={(e) => onChange({ endFeel: e.target.value })}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-7 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        >
          {END_FEEL_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <span
          className="pointer-events-none absolute right-1.5 top-1/2 hidden h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold text-slate-500 sm:inline-flex"
          aria-hidden
        >
          !
        </span>
        <div
          role="tooltip"
          className="pointer-events-none absolute bottom-full right-0 z-50 mb-1.5 w-64 max-w-[min(18rem,calc(100vw-2rem))] translate-y-0.5 rounded-md bg-slate-800 px-2.5 py-2 text-[10px] leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 sm:w-72 sm:text-xs"
        >
          {endFeelTooltip.map((line) => (
            <p key={line} className="mb-0.5 last:mb-0">
              {line}
            </p>
          ))}
        </div>
      </div>
      <select
        value={value.mmt}
        onChange={(e) => onChange({ mmt: e.target.value })}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      >
        <option value="">MMT</option>
        {MMT_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ObjectiveEvaluation({
  movements: _movements,
  romMmtInputs,
  onPatchSide,
  onReplaceMovementRow,
  locale,
  selectedDiagnosisArea,
  onAssessmentMetaChange,
}: Props) {
  const [selectedSideMode, setSelectedSideMode] = useState<SideMode>("left");
  const selectedRegion = useMemo(() => resolveRegionKey(selectedDiagnosisArea), [selectedDiagnosisArea]);
  const isExtremity = selectedRegion ? EXTREMITY_PARTS.has(selectedRegion) : false;
  const activeMotions = selectedRegion ? MOVEMENT_MAP[selectedRegion] : [];
  const bodyPartLabel = selectedRegion ? REGION_LABEL_MAP[selectedRegion] : "미선택";

  useEffect(() => {
    if (!isExtremity && selectedSideMode !== "none") {
      setSelectedSideMode("none");
    } else if (isExtremity && selectedSideMode === "none") {
      setSelectedSideMode("left");
    }
  }, [isExtremity, selectedSideMode]);

  useEffect(() => {
    const knownMotions = new Set(Object.values(MOVEMENT_MAP).flat());
    const activeSet = new Set(activeMotions);
    for (const motion of knownMotions) {
      if (activeSet.has(motion)) continue;
      const merged = mergeRow(romMmtInputs[motion]);
      if (romMmtRowHasAnyData(motion, merged)) {
        onReplaceMovementRow(motion, { left: emptySide(), right: emptySide() });
      }
    }
  }, [activeMotions, onReplaceMovementRow, romMmtInputs]);

  useEffect(() => {
    if (!onAssessmentMetaChange) return;
    const data = activeMotions.reduce<Record<string, RomMmtBySide>>((acc, motion) => {
      acc[motion] = mergeRow(romMmtInputs[motion]);
      return acc;
    }, {});
    onAssessmentMetaChange({
      bodyPart: bodyPartLabel,
      sideMode: isExtremity ? selectedSideMode : "none",
      motions: activeMotions,
      data,
    });
  }, [activeMotions, bodyPartLabel, isExtremity, onAssessmentMetaChange, romMmtInputs, selectedSideMode]);

  const endFeelTooltip = useMemo(
    () =>
      locale === "en"
        ? [
            "Soft: Soft feel from tissue approximation (e.g., knee flexion)",
            "Firm: Elastic resistance from capsule/ligament stretch (e.g., hip rotation)",
            "Hard: Solid bony stop from bone-to-bone contact (e.g., elbow extension)",
            "Empty: Motion stopped by pain before end-range (clinical caution)",
          ]
        : [
            "Soft: 조직의 근접(Tissue approximation)으로 인한 부드러운 느낌 (예: 무릎 굴곡)",
            "Firm: 관절낭이나 인대의 신장으로 인한 탄력 있는 저항감 (예: 고관절 회전)",
            "Hard: 뼈와 뼈의 접촉으로 인한 단단한 멈춤 (예: 주관절 신전)",
            "Empty: 통증 때문에 끝범위에 도달하기 전 환자가 저지함 (임상적 주의 필요)",
          ],
    [locale],
  );

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 sm:p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs">
        ROM / PROM + End Feel + MMT
      </p>

      <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3">
        <label className="mb-1 block text-xs font-bold text-slate-600">현재 평가 부위</label>
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
          현재 평가 부위: {bodyPartLabel}
        </p>
      </div>

      {isExtremity ? (
        <div className="mb-3 inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white">
          {[
            { id: "left" as const, label: "좌측 (L)" },
            { id: "right" as const, label: "우측 (R)" },
            { id: "bilateral" as const, label: "양측 (Bilateral)" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedSideMode(tab.id)}
              className={`px-3 py-2 text-xs font-bold transition sm:text-sm ${
                selectedSideMode === tab.id
                  ? "bg-indigo-600 text-white"
                  : "border-l border-slate-200 bg-white text-slate-700 first:border-l-0 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="space-y-2 sm:space-y-2.5">
        {activeMotions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
            Step 1에서 부위를 먼저 선택해 주세요.
          </div>
        ) : activeMotions.map((movement) => {
          const row = mergeRow(romMmtInputs[movement]);
          return (
            <div key={movement} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <p className="mb-2 text-xs font-black text-slate-800 sm:text-sm">{movement}</p>
              {isExtremity && selectedSideMode === "bilateral" ? (
                <div className="space-y-2">
                  <div>
                    <p className="mb-1 text-[11px] font-bold text-slate-500">(L)</p>
                    <RomFields value={row.left} onChange={(patch) => onPatchSide(movement, "left", patch)} endFeelTooltip={endFeelTooltip} />
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-bold text-slate-500">(R)</p>
                    <RomFields value={row.right} onChange={(patch) => onPatchSide(movement, "right", patch)} endFeelTooltip={endFeelTooltip} />
                  </div>
                </div>
              ) : (
                <RomFields
                  value={isExtremity && selectedSideMode === "right" ? row.right : row.left}
                  onChange={(patch) => onPatchSide(movement, isExtremity && selectedSideMode === "right" ? "right" : "left", patch)}
                  endFeelTooltip={endFeelTooltip}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
