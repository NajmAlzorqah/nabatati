"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import Webcam from "react-webcam";

// react-webcam's published props type omits `ref` even though the class forwards
// it, so expose it via a loose ElementType (see react-webcam README usage).
const WebcamAny = Webcam as unknown as React.ElementType;

export type WebcamWrapperHandle = {
  capture: () => string | null;
};

type WebcamWrapperProps = {
  onError: () => void;
};

export const WebcamWrapper = forwardRef<WebcamWrapperHandle, WebcamWrapperProps>(
  function WebcamWrapper({ onError }, ref) {
    const inner = useRef<InstanceType<typeof Webcam> | null>(null);
    const [mounted, setMounted] = useState(false);

    // react-webcam touches window/navigator in its constructor, so only render
    // it after mount to keep SSR safe.
    useEffect(() => setMounted(true), []);

    useImperativeHandle(ref, () => ({
      capture: () => inner.current?.getScreenshot?.() ?? null,
    }));

    if (!mounted) return null;

    return (
      <WebcamAny
        audio={false}
        screenshotFormat="image/jpeg"
        screenshotQuality={0.9}
        videoConstraints={{
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }}
        onUserMediaError={onError}
        className="h-full w-full object-cover"
        ref={inner}
      />
    );
  },
);
