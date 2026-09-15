"use client";

import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { STAGE_LABELS } from "@/types";
import type { StatsResponse } from "@/types/api";

const MASTERY_COLORS: Record<string, string> = {
  NOT_STARTED: "#cbd5e1",
  LEARNING: "#f59e0b",
  MASTERED: "#10b981",
  REVIEW: "#f43f5e",
};

export function ChartsSection({ stats }: { stats: StatsResponse }) {
  const subjectData = stats.subjects.map((s) => ({
    name: s.name,
    value: s.totalDurationMinutes,
    color: s.color,
  }));
  const masteryData = stats.mastery.map((m) => ({
    name: STAGE_LABELS[m.stage],
    value: m.count,
    stage: m.stage,
  }));
  const trendData = stats.trend.map((t) => ({
    label: t.date.slice(5),
    minutes: t.minutes,
  }));

  const hasSubjectData = subjectData.some((s) => s.value > 0);
  const hasMasteryData = masteryData.some((m) => m.value > 0);
  const hasTrendData = trendData.some((t) => t.minutes > 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <ChartCard title="各学科学习时长占比">
        {hasSubjectData ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={subjectData}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
              >
                {subjectData.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${v} 分钟`} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty />
        )}
      </ChartCard>

      <ChartCard title="近 14 天学习时长趋势">
        {hasTrendData ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10 }} width={30} />
              <Tooltip formatter={(v) => [`${v} 分钟`, "时长"]} />
              <Area
                type="monotone"
                dataKey="minutes"
                stroke="#3b82f6"
                fill="#93c5fd"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty />
        )}
      </ChartCard>

      <ChartCard title="知识点掌握度分布">
        {hasMasteryData ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={masteryData}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
              >
                {masteryData.map((m) => (
                  <Cell
                    key={m.stage}
                    fill={MASTERY_COLORS[m.stage] ?? "#94a3b8"}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty />
        )}
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <h3 className="mb-2 text-sm font-medium text-slate-600">{title}</h3>
      {children}
    </Card>
  );
}

function ChartEmpty() {
  return (
    <div className="flex h-[200px] items-center justify-center text-xs text-slate-400">
      暂无数据
    </div>
  );
}
