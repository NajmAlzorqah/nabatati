"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "motion/react";
import { Camera, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  WebcamWrapper,
  type WebcamWrapperHandle,
} from "@/components/camera/WebcamWrapper";

type CameraViewProps = {
  onCapture: (dataUrl: string) => void;
  error?: string | null;
};

export function CameraView({ onCapture, error }: CameraViewProps) {
  const webcamRef = useRef<WebcamWrapperHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);

  const capture = useCallback(() => {
    const shot = webcamRef.current?.capture?.();
    if (shot) onCapture(shot);
    else setErr("Could not capture from the camera. Try uploading a photo instead.");
  }, [onCapture]);

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => onCapture(reader.result as string);
      reader.onerror = () => setErr("Could not read the selected image.");
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [onCapture],
  );

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-[#020817]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0"
      >
        <WebcamWrapper
          ref={webcamRef}
          onError={() =>
            setErr("Camera unavailable - check permissions or upload a photo.")
          }
        />
      </motion.div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[78%] w-[78%] max-w-sm rounded-[2rem] border-2 border-white/40" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#020817] via-[#020817]/70 to-transparent pb-6 pt-20">
        <div className="flex items-center justify-center gap-6 px-6">
          <Button
            variant="ghost"
            size="icon"
            className="pointer-events-auto h-14 w-14 rounded-full bg-white/10 text-white"
            onClick={() => fileRef.current?.click()}
            aria-label="Upload a plant photo"
          >
            <ImagePlus className="h-6 w-6" />
          </Button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={capture}
            aria-label="Take photo"
            className="pointer-events-auto rounded-full border-4 border-white bg-white/20 p-1"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#15803d]">
              <Camera className="h-7 w-7" />
            </span>
          </motion.button>
          <div className="h-14 w-14" aria-hidden />
        </div>
        {(error || err) && (
          <p className="mt-4 px-6 text-center text-sm text-white/80">{error ?? err}</p>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
