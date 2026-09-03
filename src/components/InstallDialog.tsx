"use client";

import { AnimatePresence, motion } from "motion/react";
import { Download, Leaf, Zap, WifiOff, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const FEATURES = [
  {
    icon: Zap,
    label: "فتح أسرع",
    desc: "يبدأ التطبيق فورًا من الشاشة الرئيسية",
  },
  {
    icon: WifiOff,
    label: "يعمل بدون اتصال",
    desc: "احتفظ بواجهة الكاميرا حتى مع ضعف الشبكة",
  },
  {
    icon: Leaf,
    label: "ملء الشاشة",
    desc: "تجربة تطبيق أصلي بدون شريط المتصفح",
  },
];

export function InstallDialog({
  deferred,
  onClose,
}: {
  deferred: BeforeInstallPromptEvent | null;
  onClose: () => void;
}) {
  const installing = async () => {
    await deferred?.prompt();
    const choice = await deferred?.userChoice;
    if (choice?.outcome === "accepted") onClose();
  };

  return (
    <AnimatePresence>
      {deferred && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label="تثبيت نباتاتي"
        >
          {/* Backdrop */}
          <button
            aria-label="إغلاق نافذة التثبيت"
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            initial={{ y: 60, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.96, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 320,
              damping: 28,
            }}
            className="relative w-full max-w-md overflow-hidden rounded-t-[2rem] bg-background text-white shadow-elevated sm:mx-4 sm:rounded-[2rem]"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Accent glow header */}
            <div className="relative bg-gradient-to-br from-accent to-primary px-6 pb-16 pt-10">
              <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <button
                onClick={onClose}
                aria-label="إغلاق"
                className="absolute right-5 top-5 rounded-full border border-white/20 p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-background shadow-card">
                  <Leaf className="h-10 w-10 text-chart-4" />
                </div>
                <h2 className="mt-4 text-xl font-semibold">ثبّت نباتاتي</h2>
                <p className="mt-1 text-sm text-white/80">
                  أضف رفيق صحة نباتاتك إلى شاشتك الرئيسية
                </p>
              </div>
            </div>

            {/* Body overlaps the header via negative margin */}
            <div className="relative -mt-8 rounded-t-[2rem] bg-background px-6 pb-6 pt-8">
              <div className="grid grid-cols-3 gap-3">
                {FEATURES.map((f) => (
                  <div
                    key={f.label}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-3 text-center"
                  >
                    <f.icon className="h-5 w-5 text-chart-4" />
                    <span className="text-xs font-semibold text-white">
                      {f.label}
                    </span>
                    <span className="text-[11px] leading-tight text-white/60">
                      {f.desc}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={installing}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition-transform hover:bg-primary/90 active:scale-[0.98]"
                >
                  <Download className="h-4 w-4" />
                  تثبيت الآن
                </button>
                <button
                  onClick={onClose}
                  className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
                >
                  لاحقًا
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
