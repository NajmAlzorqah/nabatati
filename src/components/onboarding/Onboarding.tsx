"use client";

import { SuppressedImg } from "@/components/ui/suppressed-img";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

type Step = {
  eyebrow: string;
  title: string;
  body: string;
  image: string;
  alt: string;
};

const STEPS: Step[] = [
  {
    eyebrow: "التعريف",
    title: "اكتشف نباتك",
    body: "التقط صورة لأي نبات وسوف نتعرّف عليه فورًا ونزوّدك بمعلومات وافية عنه.",
    image: "/Mint-leaves.jpg",
    alt: "أوراق نعناع طازجة",
  },
  {
    eyebrow: "الصحة",
    title: "قيّم حالته",
    body: "نحلل صحة نباتك ونخبرك باحتياجاته من الري والتربة والضوء وتوصيات العناية.",
    image: "/analysis-green.png",
    alt: "صورة تحليل صحة النبات",
  },
  {
    eyebrow: "الرعاية",
    title: "اسأل الطبيب النباتي",
    body: "لديك سؤال؟ اسأل الطبيب النباتي عن نباتك واحصل على إجابة فورية في أي وقت.",
    image: "/chat-doctor.png",
    alt: "محادثة مع الطبيب النباتي",
  },
];

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const next = () => (isLast ? onComplete() : setStep((s) => s + 1));

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-6 pt-safe pt-6">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary">
            <span className="h-3 w-3 rounded-full bg-emerald-300" />
          </span>
          <span>PhytoScan</span>
        </span>
        {!isLast && (
          <button
            onClick={onComplete}
            className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm hover:bg-muted"
            aria-label="تخطي مرحلة التعريف"
          >
            <X className="h-4 w-4" />
            تخطي
          </button>
        )}
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -48 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex w-full max-w-sm flex-col items-center"
          >
            <div className="mb-8 aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border shadow-card">
              <SuppressedImg
                src={current.image}
                alt={current.alt}
                className="h-full w-full object-cover"
              />
            </div>

            <p className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
              {current.eyebrow}
            </p>
            <h1 className="mt-2 text-center font-heading text-heading tracking-tight">
              {current.title}
            </h1>
            <p className="mt-3 max-w-[32ch] text-center text-sm leading-relaxed text-muted-foreground">
              {current.body}
            </p>
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="flex flex-col items-center gap-6 px-6 pb-safe pb-8">
        <div className="flex items-center gap-2" aria-hidden>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? "w-6 bg-primary" : "w-2 bg-border"
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="w-full max-w-sm rounded-full bg-primary px-6 py-3.5 font-medium text-white transition-transform hover:opacity-95 active:scale-[0.98]"
        >
          {isLast ? "ابدأ الآن" : "التالي"}
        </button>
      </footer>
    </div>
  );
}
