import type { SubjectiveScore } from "@/domain/card/review/stability";
import { normalizeMemoryStability } from "@/domain/card/review/stability";
import { calculateRetentionProbability } from "./reviewMetrics";



type StabilityPhase = {
  key: "unstable" | "fragile" | "growing" | "stable" | "solid";
  label: string;
  shortLabel: string;
  colorClass: string;
  calendarClass: string;
};



const PHASES: Array<{ min: number; phase: StabilityPhase; }> = [
  {
    min: 0,
    phase: {
      key: "unstable",
      label: "要復習",
      shortLabel: "要復習",
      colorClass: "bg-red-100 text-red-700",
      calendarClass: "bg-red-400",
    },
  },
  {
    min: 20,
    phase: {
      key: "fragile",
      label: "覚えかけ",
      shortLabel: "覚えかけ",
      colorClass: "bg-orange-100 text-orange-700",
      calendarClass: "bg-orange-400",
    },
  },
  {
    min: 40,
    phase: {
      key: "growing",
      label: "定着途上",
      shortLabel: "定着途上",
      colorClass: "bg-yellow-100 text-yellow-700",
      calendarClass: "bg-yellow-400",
    },
  },
  {
    min: 65,
    phase: {
      key: "stable",
      label: "安定",
      shortLabel: "安定",
      colorClass: "bg-green-100 text-green-700",
      calendarClass: "bg-green-400",
    },
  },
  {
    min: 85,
    phase: {
      key: "solid",
      label: "長期保持",
      shortLabel: "長期保持",
      colorClass: "bg-emerald-100 text-emerald-700",
      calendarClass: "bg-emerald-400",
    },
  },
];



const getStabilityPhase = (stabilityInternal: number, intervalDays: number = 1): StabilityPhase => {
  const s = normalizeMemoryStability(stabilityInternal);
  const retention = calculateRetentionProbability(s, intervalDays);
  const matched = [...PHASES].reverse().find((entry) => retention >= entry.min);
  return matched?.phase ?? PHASES[0].phase;
};



export { normalizeMemoryStability, type SubjectiveScore };
export { getStabilityPhase };


export type { StabilityPhase };
