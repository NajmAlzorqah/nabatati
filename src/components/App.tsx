"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BookOpen, Moon, ScanLine, Sun } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useNavigation } from "@/hooks/useNavigation";
import { useScanFlow } from "@/hooks/useScanFlow";
import { useTheme } from "@/components/theme-provider";
import { CameraView } from "@/components/camera/CameraView";
import { LightMeter } from "@/components/light/LightMeter";
import { AnalysisResult } from "@/components/scan/AnalysisResult";
import { PlantPassport } from "@/components/passport/PlantPassport";
import { PlantDoctorChat } from "@/components/doctor/PlantDoctorChat";
import { SuppressedImg } from "@/components/ui/suppressed-img";
import type { ScanResult } from "@/lib/types";

export function App() {
  const { theme, toggle } = useTheme();
  const { coords, request: requestLocation } = useGeolocation();
  const { current, stack, push, pop, resetToCamera } = useNavigation();

  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatScan, setChatScan] = useState<ScanResult | null>(null);

  const {
    phase,
    captured,
    luminance,
    handleCapture,
    retake,
    setCaptured,
  } = useScanFlow({
    coords,
    onSuccess: (scan) => {
      setResult(scan);
      push({ name: "result", scanId: scan.id });
    },
    onError: (message) => setError(message),
    onReset: resetToCamera,
  });

  // Single place that handles every "go back" — shared by the native back
  // gesture (popstate) and the on-screen back buttons (via history.back()).
  const goBack = useCallback(() => {
    // A modal is open on top: close it first and re-push the history entry we
    // consumed, keeping the browser history aligned with the in-memory stack.
    if (chatOpen) {
      setChatOpen(false);
      if (typeof window !== "undefined") {
        window.history.forward();
      }
      return;
    }
    // Root (home) — nothing left to step back to. Let the OS close/minimize.
    pop();
  }, [chatOpen, pop]);

  useEffect(() => {
    const onPop = () => goBack();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [goBack]);

  const retakeAll = useCallback(() => {
    setResult(null);
    setError(null);
    retake();
    resetToCamera();
  }, [retake, resetToCamera]);

  const openDoctor = useCallback(() => {
    if (!result) return;
    setChatScan(result);
    setChatOpen(true);
  }, [result]);

  const selectScan = useCallback(
    (scan: ScanResult) => {
      setResult(scan);
      setCaptured(scan.imageUrl);
      push({ name: "result", scanId: scan.id });
    },
    [push, setCaptured],
  );

  const handleDeletedScan = useCallback(
    (scanId: string) => {
      if (current.name === "result" && result?.id === scanId) {
        setResult(null);
        setChatScan(null);
        setChatOpen(false);
        if (typeof window !== "undefined") {
          window.history.back();
        }
      }
    },
    [current.name, result],
  );

  const openPassport = useCallback(() => {
    setError(null);
    push({ name: "passport" });
  }, [push]);

  const analyzing = phase === "uploading" || phase === "analyzing";

  const showBackOnResult = current.name === "result" && stack.length > 1;

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground">
      <AnimatePresence mode="wait">
        {analyzing ? (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-background px-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative h-64 w-64 overflow-hidden rounded-3xl bg-card"
            >
              <SuppressedImg
                src={captured ?? ""}
                alt="النبات الملتقط"
                className="absolute inset-0 h-full w-full object-cover opacity-60"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="rounded-full bg-primary/80 p-4"
                >
                  <ScanLine className="h-10 w-10 text-white" />
                </motion.div>
              </div>
            </motion.div>

            <div className="w-full max-w-sm">
              <h1 className="font-heading text-[30px] leading-tight tracking-tight">
                {phase === "uploading"
                  ? "جارٍ تجهيز الصورة…"
                  : "جارٍ تحليل نباتك…"}
              </h1>
              <p className="mt-1 text-sm text-white/70">
                {phase === "uploading"
                  ? "تحسين الصورة من أجل الفحص."
                  : "فحص صحة النبات ونوعه واحتياجات العناية به."}
              </p>
            </div>

            {phase === "analyzing" && (
              <div className="w-full max-w-sm">
                <LightMeter luminance={luminance} />
              </div>
            )}
          </motion.div>
        ) : current.name === "camera" ? (
          <motion.div
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <CameraView
              onCapture={(dataUrl) => {
                requestLocation();
                handleCapture(dataUrl);
              }}
              onOpenPassport={openPassport}
              error={error}
            />
          </motion.div>
        ) : current.name === "passport" ? (
          <motion.div
            key="passport"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-4 py-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <button
                onClick={() => window.history.back()}
                className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm hover:bg-muted"
                aria-label="العودة إلى الشاشة السابقة"
              >
                <ArrowRight className="h-4 w-4" />
                رجوع
              </button>
              <span className="flex items-center gap-1.5 font-medium">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="text-primary">الكتالوج</span>
              </span>
              <button
                onClick={toggle}
                className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm hover:bg-muted"
                aria-label="تبديل المظهر"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
            </div>

            <h1 className="font-heading text-[30px] leading-tight tracking-tight">
              كتالوج النبات
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              كل نباتاتك المفحوصة في مكان واحد.
            </p>

            <div className="mt-6">
              <PlantPassport
                latestId={captured ?? undefined}
                onSelect={selectScan}
                onDeleted={handleDeletedScan}
                variant="grid"
              />
            </div>
          </motion.div>
        ) : (
          result && (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-medium">
                  {showBackOnResult && (
                    <button
                      onClick={() => window.history.back()}
                      className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm hover:bg-muted"
                      aria-label="العودة إلى الكتالوج"
                    >
                      <ArrowRight className="h-4 w-4" />
                      رجوع
                    </button>
                  )}
                  <span className="text-primary">PhytoScan</span>
                </div>
                <button
                  onClick={toggle}
                  className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm hover:bg-muted"
                  aria-label="تبديل المظهر"
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </button>
              </div>

              {error && (
                <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </p>
              )}

              <div className="overflow-hidden rounded-3xl border border-border shadow-card">
                <SuppressedImg
                  src={captured ?? ""}
                  alt="النبات المفحوص"
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>

              <AnalysisResult analysis={result.analysis} onAskDoctor={openDoctor} />

              <button
                onClick={retakeAll}
                className="w-full rounded-full border border-border px-5 py-3 font-medium transition-transform hover:bg-muted active:scale-[0.98]"
              >
                امسح نباتًا آخر
              </button>

              <PlantPassport
                latestId={result.id}
                onSelect={selectScan}
                onDeleted={handleDeletedScan}
              />
            </motion.div>
          )
        )}
      </AnimatePresence>

      <PlantDoctorChat
        key={chatScan?.id ?? "none"}
        open={chatOpen}
        onOpenChange={setChatOpen}
        scan={chatScan}
      />
    </div>
  );
}
