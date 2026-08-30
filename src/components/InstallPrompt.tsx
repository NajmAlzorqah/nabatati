"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { InstallDialog } from "@/components/InstallDialog";

// beforeinstallprompt is a Chromium-only event not in the standard TS DOM lib.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type InstallPromptEvent = BeforeInstallPromptEvent;

// Server snapshot is always false; client snapshot reflects the real value.
// useSyncExternalStore avoids React-Compiler lint (no setState in effect) and
// prevents hydration mismatches for browser-only environment flags.
function useClientValue(value: boolean): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => value,
    () => false,
  );
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as { MSStream?: unknown }).MSStream
  );
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator;
}

export function InstallPrompt() {
  const ios = useClientValue(isIOS());
  const installed = useClientValue(isStandalone());
  const supported = useClientValue(isSupported());
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!supported) return;

    // Register the service worker (app shell / instant offline open).
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {});

    // Chromium fires this when the app is installable. Capturing it lets us
    // offer our own install dialog instead of waiting on browser UI. The
    // handle is only valid once, so we consume it on install.
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [supported]);

  // Already installed -> nothing to show.
  if (installed) return null;

  // Chromium gave us an install handle -> polished install confirmation popup.
  if (deferred) {
    return <InstallDialog deferred={deferred} onClose={() => setDeferred(null)} />;
  }

  // iOS has no install prompt -> guide the user manually.
  if (ios && !dismissed) {
    return (
      <div
        role="status"
        className="fixed inset-x-0 bottom-0 z-50 mx-auto mb-4 max-w-md px-4"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="pointer-events-auto flex w-full items-start gap-3 rounded-2xl border border-border bg-popover p-4 shadow-card">
          <div className="flex-1 text-sm">
            <p className="font-semibold text-foreground">ثبّت PhytoScan على شاشتك الرئيسية</p>
            <p className="mt-1 text-muted-foreground">
              اضغط زر المشاركة{" "}
              <span
                aria-hidden="true"
                className="mx-0.5 inline-flex h-5 w-5 translate-y-0.5 items-center justify-center rounded-lg bg-muted"
              >
                ⎋
              </span>{" "}
              ثم اختر «إضافة إلى الشاشة الرئيسية» لاستخدام التطبيق بملء الشاشة وفتح أسرع.
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
