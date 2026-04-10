"use client";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { Evaluation } from "@/types";

interface Props {
  evaluation: Evaluation;
}

export default function ScoreChart({ evaluation }: Props) {
  const data = [
    { subject: "Title", score: evaluation.title_score },
    { subject: "Description", score: evaluation.description_score },
    { subject: "Modules", score: evaluation.module_score },
    { subject: "Technology", score: evaluation.tech_score },
    { subject: "Innovation", score: evaluation.innovation_score },
    { subject: "Feasibility", score: evaluation.feasibility_score },
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
        <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
        <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, "Score"]} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
