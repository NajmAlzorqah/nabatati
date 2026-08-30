"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Moon, ScanLine, Sun } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useTheme } from "@/components/theme-provider";
import { CameraView } from "@/components/camera/CameraView";
import { LightMeter } from "@/components/light/LightMeter";
import { AnalysisResult } from "@/components/scan/AnalysisResult";
import { PlantPassport } from "@/components/passport/PlantPassport";
import { PlantDoctorChat } from "@/components/doctor/PlantDoctorChat";
import { compressImage } from "@/lib/compress";
import { luminanceFromDataUrl } from "@/lib/luminance";
import { analyzePlant } from "@/lib/analysis";
import { saveScan } from "@/lib/db";
import { randomId } from "@/lib/utils";
import { getSupabase, uploadPlantImage } from "@/lib/supabase";
import type { ScanResult } from "@/lib/types";

type Step = "camera" | "uploading" | "analyzing" | "result";

export function App() {
  const { theme, toggle } = useTheme();
  const { coords } = useGeolocation();
  const [step, setStep] = useState<Step>("camera");
  const [captured, setCaptured] = useState<string | null>(null);
  const [luminance, setLuminance] = useState(0.5);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatScan, setChatScan] = useState<ScanResult | null>(null);

  const handleCapture = useCallback(
    async (dataUrl: string) => {
      setCaptured(dataUrl);
      setError(null);
      setStep("uploading");
      setLuminance(luminanceFromDataUrl(dataUrl));

      try {
        const compressed = await compressImage(
          await dataUrlToBlob(dataUrl),
        );
        setStep("analyzing");

        const scanId = randomId();

        // Upload image to Supabase Storage when available; fall back to the
        // compressed data URL when Supabase is unconfigured.
        let imageUrl = "";
        if (getSupabase()) {
          imageUrl = await uploadPlantImage(compressed.base64, scanId);
        } else {
          imageUrl = compressed.base64;
        }

        // Webhook payload: the image travels as a URL only (public Supabase
        // URL, or the compressed data URL when Supabase is unconfigured).
        const analysis = await analyzePlant({
          imageUrl,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
        });

        const scan: ScanResult = {
          id: scanId,
          imageUrl: imageUrl || compressed.base64,
          analysis: analysis.analysis,
          temp: analysis.temp ?? null,
          humidity: analysis.humidity ?? null,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          createdAt: new Date().toISOString(),
        };
        await saveScan(scan);
        setResult(scan);
        setStep("result");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "حدث خطأ ما";
        setError(msg);
        setStep("camera");
      }
    },
    [coords],
  );

  const retake = useCallback(() => {
    setResult(null);
    setCaptured(null);
    setError(null);
    setStep("camera");
  }, []);

  const openDoctor = useCallback(() => {
    if (!result) return;
    setChatScan(result);
    setChatOpen(true);
  }, [result]);

  const selectScan = useCallback((scan: ScanResult) => {
    setResult(scan);
    setCaptured(scan.imageUrl);
    setStep("result");
  }, []);

  const analyzing = step === "uploading" || step === "analyzing";

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground">
      <AnimatePresence mode="wait">
        {step === "camera" ? (
          <motion.div
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <CameraView onCapture={handleCapture} error={error} />
          </motion.div>
        ) : analyzing ? (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-[#020817] px-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative h-64 w-64 overflow-hidden rounded-3xl bg-[#0d1420]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={captured ?? ""}
                alt="النبات الملتقط"
                className="absolute inset-0 h-full w-full object-cover opacity-60"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="rounded-full bg-[#15803d]/80 p-4"
                >
                  <ScanLine className="h-10 w-10 text-white" />
                </motion.div>
              </div>
            </motion.div>

            <div className="w-full max-w-sm">
              <h1 className="font-heading text-[30px] leading-tight tracking-tight">
                {step === "uploading"
                  ? "جارٍ تجهيز الصورة…"
                  : "جارٍ تحليل نباتك…"}
              </h1>
              <p className="mt-1 text-sm text-white/70">
                {step === "uploading"
                  ? "تحسين الصورة من أجل الفحص."
                  : "فحص صحة النبات ونوعه واحتياجات العناية به."}
              </p>
            </div>

            {step === "analyzing" && (
              <div className="w-full max-w-sm">
                <LightMeter luminance={luminance} />
              </div>
            )}
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
                  <span className="text-[#15803d]">PhytoScan</span>
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={captured ?? ""}
                  alt="النبات المفحوص"
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>

              <AnalysisResult
                analysis={result.analysis}
                onAskDoctor={openDoctor}
              />

              <button
                onClick={retake}
                className="w-full rounded-full border border-border px-5 py-3 font-medium transition-transform hover:bg-muted active:scale-[0.98]"
              >
                امسح نباتًا آخر
              </button>

              <PlantPassport latestId={result.id} onSelect={selectScan} />
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

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
