"use client";

import { motion, useReducedMotion } from "motion/react";
import { Sun } from "lucide-react";

type LightMeterProps = {
  luminance: number; // 0..1
};

function luminanceLabel(v: number): string {
  if (v >= 0.7) return "Bright";
  if (v >= 0.45) return "Moderate";
  if (v >= 0.2) return "Dim";
  return "Very Low";
}

export function LightMeter({ luminance }: LightMeterProps) {
  const reduce = useReducedMotion();
  const pct = Math.round(luminance * 100);
  const label = luminanceLabel(luminance);

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sun className="h-4 w-4 text-[#86efac]" />
          <span className="text-sm font-medium text-white/90">
            Light meter · {label}
          </span>
        </div>
        <span className="font-mono text-sm text-white/70">{pct}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={reduce ? { width: 0 } : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full bg-gradient-to-r from-[#15803d] to-[#86efac]"
        />
      </div>
    </div>
  );
}
