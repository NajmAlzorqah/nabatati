"use client";

import { useCallback, useEffect, useState } from "react";
import { History, RefreshCw } from "lucide-react";
import { deleteScan, getRecentScans } from "@/lib/db";
import type { ScanResult } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { ScanCard } from "@/components/passport/ScanCard";

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
            <History className="h-4 w-4 text-primary" />
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
      ) : (
        <ul
          className={
            variant === "grid"
              ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
              : "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
          }
        >
          {scans.map((s, i) => (
            <ScanCard
              key={s.id}
              scan={s}
              onSelect={onSelect}
              onDelete={(scan) => setPendingDelete(scan)}
              deleting={deleting === s.id}
              variant={variant}
              index={i}
            />
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