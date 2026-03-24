"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PatientProgressPoint } from "@/utils/supabase/analytics";

type ProgressChartProps = {
  data: PatientProgressPoint[];
};

function formatDateLabel(date: string) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getSimpleAssessment(vas: number) {
  if (vas >= 7) return "통증 강도 높음";
  if (vas >= 4) return "중등도 통증";
  return "통증 조절 양호";
}

export default function ProgressChart({ data }: ProgressChartProps) {
  return (
    <div className="h-72 w-full rounded-2xl border border-zinc-200 bg-white p-3">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
          <defs>
            <linearGradient id="vasGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            tick={{ fontSize: 12, fill: "#52525b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 10]}
            ticks={[0, 2, 4, 6, 8, 10]}
            tick={{ fontSize: 12, fill: "#52525b" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              borderColor: "#e4e4e7",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
            formatter={(value: any) => [`VAS ${value}/10`, "통증 지수"]}
            labelFormatter={(label) => {
              const found = data.find((d) => d.date === label);
              const vas = found?.vas ?? 0;
              return `${formatDateLabel(label)} · ${getSimpleAssessment(vas)}`;
            }}
          />
          <Area
            type="monotone"
            dataKey="vas"
            stroke="#0284c7"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#vasGradient)"
            dot={{ r: 3, fill: "#0284c7" }}
            activeDot={{ r: 5, fill: "#0f766e" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

