"use client";

import { useCallback, useMemo, useState } from "react";
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

const DEFAULT_ROW: RomMmtInput = { arom: "", prom: "", endFeel: "Normal", mmt: "" };

/** 시상면 위주로 좌·우 구분 없이 기록하는 항목 (Flexion / Extension 단독 라벨) */
export function isSagittalNoLrMovement(movementName: string): boolean {
  const n = movementName.trim().toLowerCase();
  return n === "flexion" || n === "extension";
}

function emptySide(): RomMmtInput {
  return { ...DEFAULT_ROW, endFeel: "Normal" };
}

function mergeRow(row: RomMmtBySide | undefined): RomMmtBySide {
  return {
    left: { ...DEFAULT_ROW, ...(row?.left ?? {}) },
    right: { ...DEFAULT_ROW, ...(row?.right ?? {}) },
  };
}

/** 단일 폼 표시용: 구버전 데이터가 우측만 채워진 경우 우측 값을 잠시 보여 줌 */
function pickSagittalDisplaySource(row: RomMmtBySide): RomMmtInput {
  const left = mergeRow(row).left;
  const right = mergeRow(row).right;
  const leftUsed = Boolean(left.arom || left.prom || left.mmt || (left.endFeel && left.endFeel !== "Normal"));
  const rightUsed = Boolean(right.arom || right.prom || right.mmt || (right.endFeel && right.endFeel !== "Normal"));
  if (leftUsed || !rightUsed) return left;
  return right;
}

export function formatRomMmtLineForEvaluation(movement: string, row: RomMmtBySide, tagRomMmt: string): string {
  const { left, right } = mergeRow(row);
  if (isSagittalNoLrMovement(movement)) {
    const src = pickSagittalDisplaySource({ left, right });
    return `${tagRomMmt} ${movement} | AROM: ${src.arom || "-"} | PROM: ${src.prom || "-"} | End Feel: ${src.endFeel || "-"} | MMT: ${src.mmt || "-"}`;
  }
  return `${tagRomMmt} ${movement} | L-AROM: ${left.arom || "-"} | L-PROM: ${left.prom || "-"} | L-End Feel: ${left.endFeel || "-"} | L-MMT: ${left.mmt || "-"} | R-AROM: ${right.arom || "-"} | R-PROM: ${right.prom || "-"} | R-End Feel: ${right.endFeel || "-"} | R-MMT: ${right.mmt || "-"}`;
}

export function romMmtRowHasAnyData(movement: string, row: RomMmtBySide | undefined): boolean {
  const { left, right } = mergeRow(row);
  if (isSagittalNoLrMovement(movement)) {
    return Boolean(left.arom || left.prom || left.mmt || right.arom || right.prom || right.mmt);
  }
  return Boolean(
    left.arom || left.prom || left.mmt || right.arom || right.prom || right.mmt,
  );
}

type Props = {
  movements: string[];
  romMmtInputs: Record<string, RomMmtBySide>;
  onPatchSide: (movement: string, side: Side, patch: Partial<RomMmtInput>) => void;
  onReplaceMovementRow: (movement: string, next: RomMmtBySide) => void;
  locale: SoapLocale;
};

function RomFields({
  value,
  onChange,
  endFeelTooltip,
  compact,
}: {
  value: RomMmtInput;
  onChange: (patch: Partial<RomMmtInput>) => void;
  endFeelTooltip: string[];
  compact?: boolean;
}) {
  const gap = compact ? "gap-1.5" : "gap-2";
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 ${gap}`}>
      <input
        value={value.arom}
        onChange={(e) => onChange({ arom: e.target.value })}
        placeholder="AROM"
        className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-400 sm:h-9 sm:text-sm"
      />
      <input
        value={value.prom}
        onChange={(e) => onChange({ prom: e.target.value })}
        placeholder="PROM"
        className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-400 sm:h-9 sm:text-sm"
      />
      <div className="group relative min-w-0">
        <select
          value={value.endFeel}
          onChange={(e) => onChange({ endFeel: e.target.value })}
          className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 pr-7 text-xs outline-none focus:border-blue-400 sm:h-9 sm:text-sm"
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
        className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-400 sm:h-9 sm:text-sm"
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

function SideSegmentedControl({
  active,
  onChange,
  locale,
}: {
  active: Side;
  onChange: (side: Side) => void;
  locale: SoapLocale;
}) {
  const isEn = locale === "en";
  const tabs: { id: Side; label: string }[] = [
    { id: "left", label: isEn ? "Left" : "좌 (L)" },
    { id: "right", label: isEn ? "Right" : "우 (R)" },
  ];
  return (
    <div
      role="tablist"
      aria-label={isEn ? "Side" : "측별"}
      className="mb-2 inline-flex w-full max-w-xs overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-0.5"
    >
      {tabs.map((tab) => {
        const on = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(tab.id)}
            className={`min-h-8 flex-1 rounded-md px-2 text-xs font-black transition sm:text-sm ${
              on ? "bg-[#0f172a] text-white shadow-sm" : "bg-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function BilateralMovementCard({
  movement,
  row,
  onPatchSide,
  locale,
  endFeelTooltip,
}: {
  movement: string;
  row: RomMmtBySide;
  onPatchSide: (movement: string, side: Side, patch: Partial<RomMmtInput>) => void;
  locale: SoapLocale;
  endFeelTooltip: string[];
}) {
  const [activeSide, setActiveSide] = useState<Side>("left");
  const merged = mergeRow(row);
  const activeRow = merged[activeSide];

  const handleFieldChange = useCallback(
    (patch: Partial<RomMmtInput>) => {
      onPatchSide(movement, activeSide, patch);
    },
    [activeSide, movement, onPatchSide],
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3">
      <p className="mb-1.5 text-xs font-bold text-slate-800 sm:text-sm">{movement}</p>
      <SideSegmentedControl active={activeSide} onChange={setActiveSide} locale={locale} />
      <div key={activeSide} className="animate-in fade-in duration-150" role="tabpanel">
        <RomFields value={activeRow} onChange={handleFieldChange} endFeelTooltip={endFeelTooltip} compact />
      </div>
    </div>
  );
}

function SagittalMovementCard({
  movement,
  row,
  onReplaceMovementRow,
  endFeelTooltip,
  locale,
}: {
  movement: string;
  row: RomMmtBySide;
  onReplaceMovementRow: (movement: string, next: RomMmtBySide) => void;
  endFeelTooltip: string[];
  locale: SoapLocale;
}) {
  const merged = mergeRow(row);
  const display = pickSagittalDisplaySource(merged);

  const handleFieldChange = useCallback(
    (patch: Partial<RomMmtInput>) => {
      const nextLeft: RomMmtInput = {
        ...DEFAULT_ROW,
        ...merged.left,
        ...patch,
      };
      onReplaceMovementRow(movement, {
        left: nextLeft,
        right: emptySide(),
      });
    },
    [merged.left, movement, onReplaceMovementRow],
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3">
      <p className="mb-1.5 text-xs font-bold text-slate-800 sm:text-sm">{movement}</p>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {locale === "en" ? "Midline (single entry)" : "시상면 · 단일 입력"}
      </p>
      <RomFields value={display} onChange={handleFieldChange} endFeelTooltip={endFeelTooltip} compact />
    </div>
  );
}

export function ObjectiveEvaluation({
  movements,
  romMmtInputs,
  onPatchSide,
  onReplaceMovementRow,
  locale,
}: Props) {
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

  const title =
    locale === "en" ? "ROM / PROM + End Feel + MMT" : "ROM / PROM + End Feel + MMT";

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 sm:p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs">{title}</p>
      <div className="space-y-2 sm:space-y-2.5">
        {movements.map((movement) => {
          const row = romMmtInputs[movement] ?? {
            left: { ...DEFAULT_ROW },
            right: { ...DEFAULT_ROW },
          };
          if (isSagittalNoLrMovement(movement)) {
            return (
              <SagittalMovementCard
                key={movement}
                movement={movement}
                row={row}
                onReplaceMovementRow={onReplaceMovementRow}
                endFeelTooltip={endFeelTooltip}
                locale={locale}
              />
            );
          }
          return (
            <BilateralMovementCard
              key={movement}
              movement={movement}
              row={row}
              onPatchSide={onPatchSide}
              locale={locale}
              endFeelTooltip={endFeelTooltip}
            />
          );
        })}
      </div>
    </div>
  );
}
