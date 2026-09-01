"use client";

import { motion } from "motion/react";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SuppressedImg } from "@/components/ui/suppressed-img";
import { healthTone } from "@/lib/styles";
import type { ScanResult } from "@/lib/types";

type ScanCardProps = {
  scan: ScanResult;
  onSelect: (scan: ScanResult) => void;
  onDelete: (scan: ScanResult) => void;
  deleting: boolean;
  variant?: "row" | "grid";
  index?: number;
};

export function ScanCard({
  scan,
  onSelect,
  onDelete,
  deleting,
  variant = "row",
  index = 0,
}: ScanCardProps) {
  const isGrid = variant === "grid";

  return (
    <motion.li
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
    >
      <div
        className={
          isGrid
            ? "relative w-full overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-transform"
            : "relative w-40 shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-transform"
        }
      >
        <button
          onClick={() => onSelect(scan)}
          className="flex w-full flex-col text-start active:scale-[0.98]"
        >
          <div className="aspect-[4/3] w-full bg-muted">
            <SuppressedImg
              src={scan.imageUrl}
              alt={scan.analysis.identification.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="flex flex-col gap-1 p-3">
            <Badge
              className={`h-5 w-fit ${
                healthTone[scan.analysis.health_assessment.status] ??
                healthTone["صحي"]
              }`}
            >
              {scan.analysis.health_assessment.status}
            </Badge>
            <p className="truncate text-sm font-medium">
              {scan.analysis.identification.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(scan.createdAt).toLocaleDateString("ar", {
                numberingSystem: "latn",
              })}
            </p>
          </div>
        </button>
        {deleting ? (
          <span className="absolute end-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-xs text-white">
            …
          </span>
        ) : (
          <button
            onClick={() => onDelete(scan)}
            className="absolute end-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-red-600"
            aria-label={`حذف ${scan.analysis.identification.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.li>
  );
}
