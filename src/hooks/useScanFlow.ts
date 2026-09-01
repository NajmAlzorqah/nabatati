import { useCallback, useState } from "react";
import { compressImage } from "@/lib/compress";
import { luminanceFromDataUrl } from "@/lib/luminance";
import { analyzePlant } from "@/lib/analysis";
import { saveScan } from "@/lib/db";
import { randomId, dataUrlToBlob } from "@/lib/utils";
import { getSupabase, uploadPlantImage } from "@/lib/supabase";
import type { LocationCoords } from "@/hooks/useGeolocation";
import type { ScanResult } from "@/lib/types";

export type Phase = "idle" | "uploading" | "analyzing";

type UseScanFlowArgs = {
  coords: LocationCoords | null;
  onSuccess: (scan: ScanResult) => void;
  onError: (message: string) => void;
  onReset: () => void;
};

export function useScanFlow({ coords, onSuccess, onError, onReset }: UseScanFlowArgs) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [captured, setCaptured] = useState<string | null>(null);
  const [luminance, setLuminance] = useState(0.5);

  const handleCapture = useCallback(
    async (dataUrl: string) => {
      setCaptured(dataUrl);
      setPhase("uploading");
      setLuminance(luminanceFromDataUrl(dataUrl));

      try {
        const blob = await dataUrlToBlob(dataUrl);
        const compressed = await compressImage(blob);
        setPhase("analyzing");

        const scanId = randomId();

        let imageUrl = "";
        if (getSupabase()) {
          imageUrl = await uploadPlantImage(compressed.base64, scanId);
        } else {
          imageUrl = compressed.base64;
        }

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
        setPhase("idle");
        onSuccess(scan);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "حدث خطأ ما";
        setPhase("idle");
        onError(msg);
        onReset();
      }
    },
    [coords, onSuccess, onError, onReset],
  );

  const retake = useCallback(() => {
    setCaptured(null);
    setLuminance(0.5);
    setPhase("idle");
  }, []);

  return { phase, captured, luminance, handleCapture, retake, setCaptured };
}
