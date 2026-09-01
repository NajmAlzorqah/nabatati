"use client";

import { motion, useReducedMotion } from "motion/react";
import { Sun } from "lucide-react";

type LightMeterProps = {
  luminance: number; // 0..1
};

function luminanceLabel(v: number): string {
  if (v >= 0.7) return "ساطع";
  if (v >= 0.45) return "معتدل";
  if (v >= 0.2) return "خافت";
  return "منخفض جدًا";
}

export function LightMeter({ luminance }: LightMeterProps) {
  const reduce = useReducedMotion();
  const pct = Math.round(luminance * 100);
  const label = luminanceLabel(luminance);

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sun className="h-4 w-4 text-chart-5" />
          <span className="text-sm font-medium text-white/90">
            قياس الضوء · {label}
          </span>
        </div>
        <span className="font-mono text-sm text-white/70">{pct}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full bg-gradient-to-r from-primary to-chart-5"
        />
      </div>
    </div>
  );
}
