"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const axis = { fontSize: 11, fill: "#94a3b8" };
const grid = "#1c2740";

const tooltipStyle = {
  borderRadius: 12,
  backgroundColor: "#0d1426",
  border: "1px solid #1c2740",
  color: "#f1f5f9",
  boxShadow: "0 16px 40px rgba(2, 8, 23, 0.55)",
  fontSize: 12,
  itemStyle: { color: "#f1f5f9" },
  labelStyle: { color: "#94a3b8" },
};

export const CHART_COLORS = {
  indigo: "#2563eb",
  emerald: "#22c55e",
  amber: "#f59e0b",
  rose: "#ef4444",
  sky: "#22d3ee",
  slate: "#94a3b8",
};

export function SubjectBarChart({
  data,
}: {
  data: { name: string; avg: number; pass: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={axis} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={150}
          tick={axis}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
        <Bar dataKey="avg" name="Average" fill={CHART_COLORS.indigo} radius={[0, 6, 6, 0]} barSize={12} />
        <Bar dataKey="pass" name="Pass rate" fill={CHART_COLORS.emerald} radius={[0, 6, 6, 0]} barSize={12} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function IndicatorDonut({
  data,
}: {
  data: { name: string; value: number; color: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={62}
          outerRadius={96}
          paddingAngle={3}
          stroke="#080d1b"
          strokeWidth={2}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SectionComparisonChart({
  data,
  terms,
}: {
  data: Record<string, string | number>[];
  terms: string[];
}) {
  const colors = [CHART_COLORS.indigo, CHART_COLORS.emerald, CHART_COLORS.amber];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: -16, right: 8, top: 4, bottom: 4 }}>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={axis} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
        {terms.map((term, index) => (
          <Bar
            key={term}
            dataKey={term}
            fill={colors[index % colors.length]}
            radius={[6, 6, 0, 0]}
            barSize={26}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TermTrendChart({
  data,
}: {
  data: { term: string; avg: number; attendance: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ left: -16, right: 8, top: 8, bottom: 4 }}>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="term" tick={axis} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={axis} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
        <Line
          type="monotone"
          dataKey="avg"
          name="Average score"
          stroke={CHART_COLORS.indigo}
          strokeWidth={2.5}
          dot={{ r: 4, strokeWidth: 2 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="attendance"
          name="Attendance"
          stroke={CHART_COLORS.emerald}
          strokeWidth={2.5}
          dot={{ r: 4, strokeWidth: 2 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ScoreDistributionChart({
  data,
}: {
  data: { band: string; students: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: -16, right: 8, top: 4, bottom: 4 }}>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="band" tick={axis} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="students" name="Students" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={entry.band}
              fill={
                ["#ef4444", "#f59e0b", "#2563eb", "#22d3ee", "#22c55e"][index] ??
                CHART_COLORS.indigo
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SubjectRadarChart({
  data,
}: {
  data: { subject: string; current: number; previous: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} outerRadius={100}>
        <PolarGrid stroke="#1c2740" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#94a3b8" }} />
        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} angle={90} />
        <Radar
          name="Current term"
          dataKey="current"
          stroke={CHART_COLORS.indigo}
          fill={CHART_COLORS.indigo}
          fillOpacity={0.22}
          strokeWidth={2}
        />
        <Radar
          name="Previous term"
          dataKey="previous"
          stroke={CHART_COLORS.slate}
          fill={CHART_COLORS.slate}
          fillOpacity={0.08}
          strokeWidth={1.5}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => `${Number(value).toFixed(1)}%`} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function AssessmentTrendChart({
  data,
}: {
  data: { label: string; score: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ left: -16, right: 8, top: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.indigo} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART_COLORS.indigo} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ ...axis, fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis domain={[0, 100]} tick={axis} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => `${Number(value).toFixed(1)}%`} />
        <Area
          type="monotone"
          dataKey="score"
          name="Score"
          stroke={CHART_COLORS.indigo}
          strokeWidth={2.5}
          fill="url(#scoreFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
