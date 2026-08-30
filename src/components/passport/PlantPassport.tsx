"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { History, RefreshCw, Trash2 } from "lucide-react";
import { deleteScan, getRecentScans } from "@/lib/db";
import type { ScanResult } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";

const healthTone: Record<string, string> = {
  صحي: "bg-[#dcfce7] text-[#166534] dark:bg-[#15803d]/20 dark:text-[#86efac]",
  إنذار: "bg-[#fef3c7] text-[#92400e] dark:bg-amber-500/20 dark:text-amber-300",
  حرج: "bg-[#fee2e2] text-[#991b1b] dark:bg-red-500/20 dark:text-red-300",
};

export function PlantPassport({
  latestId,
  onSelect,
  onDeleted,
  variant = "row",
}: {
  latestId?: string;
  onSelect: (scan: ScanResult) => void;
  onDeleted?: (scanId: string) => void;
  variant?: "row" | "grid";
}) {
  const [scans, setScans] = useState<ScanResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ScanResult | null>(null);

  const load = useCallback(() => {
    getRecentScans(20)
      .then(setScans)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [latestId, load]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const scan = pendingDelete;
    setPendingDelete(null);
    setDeleting(scan.id);
    setError(null);
    try {
      await deleteScan(scan.id);
      setScans((prev) => prev?.filter((s) => s.id !== scan.id) ?? null);
      onDeleted?.(scan.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر حذف النبات");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <section className={variant === "grid" ? "" : "mt-8"}>
      {variant === "row" && (
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[#15803d]" />
            <h2 className="font-heading text-[30px] leading-tight tracking-tight">
              كتالوج النبات
            </h2>
          </div>
          <button
            onClick={() => load()}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            aria-label="تحديث الكتالوج"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            تحديث
          </button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">تعذّر الحذف: {error}</p>}

      {scans === null ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full rounded-2xl" />
          ))}
        </div>
      ) : scans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center">
          <p className="font-medium">لا توجد فحوصات بعد</p>
          <p className="mt-1 text-sm text-muted-foreground">
            التقط صورة نبات أو ارفعها لبناء كتالوجك.
          </p>
        </div>
      ) : variant === "grid" ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {scans.map((s, i) => (
            <motion.li
              key={s.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
            >
              <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-transform">
                <button
                  onClick={() => onSelect(s)}
                  className="flex w-full flex-col text-start active:scale-[0.98]"
                >
                  <div className="aspect-[4/3] w-full bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.imageUrl}
                      alt={s.analysis.identification.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex flex-col gap-1 p-3">
                    <Badge
                      className={`h-5 w-fit ${
                        healthTone[s.analysis.health_assessment.status] ??
                        healthTone["صحي"]
                      }`}
                    >
                      {s.analysis.health_assessment.status}
                    </Badge>
                    <p className="truncate text-sm font-medium">
                      {s.analysis.identification.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString("ar", {
                        numberingSystem: "latn",
                      })}
                    </p>
                  </div>
                </button>
                {deleting === s.id ? (
                  <span className="absolute end-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-xs text-white">
                    …
                  </span>
                ) : (
                  <button
                    onClick={() => setPendingDelete(s)}
                    className="absolute end-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-red-600"
                    aria-label={`حذف ${s.analysis.identification.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </motion.li>
          ))}
        </ul>
      ) : (
        <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
          {scans.map((s, i) => (
            <motion.li
              key={s.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
            >
              <div className="relative w-40 shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-transform">
                <button
                  onClick={() => onSelect(s)}
                  className="flex w-full flex-col text-start active:scale-[0.98]"
                >
                  <div className="aspect-[4/3] w-full bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.imageUrl}
                      alt={s.analysis.identification.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex flex-col gap-1 p-3">
                    <Badge
                      className={`h-5 w-fit ${
                        healthTone[s.analysis.health_assessment.status] ??
                        healthTone["صحي"]
                      }`}
                    >
                      {s.analysis.health_assessment.status}
                    </Badge>
                    <p className="truncate text-sm font-medium">
                      {s.analysis.identification.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString("ar", {
                        numberingSystem: "latn",
                      })}
                    </p>
                  </div>
                </button>
                {deleting === s.id ? (
                  <span className="absolute end-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-xs text-white">
                    …
                  </span>
                ) : (
                  <button
                    onClick={() => setPendingDelete(s)}
                    className="absolute end-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-red-600"
                    aria-label={`حذف ${s.analysis.identification.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </motion.li>
          ))}
        </ul>
      )}

      <ConfirmDeleteDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="حذف النبات؟"
        description={`سيتم حذف «${pendingDelete?.analysis.identification.name}» نهائيًا مع صورته وسجل المحادثة.`}
        loading={deleting !== null}
        onConfirm={confirmDelete}
      />
    </section>
  );
}