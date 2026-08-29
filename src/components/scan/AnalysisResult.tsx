"use client";

import { motion } from "motion/react";
import {
  Droplets,
  FlaskConical,
  HeartPulse,
  Leaf,
  Lightbulb,
  PawPrint,
  Quote,
  Sprout,
} from "lucide-react";
import type { PlantAnalysis } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statusStyles: Record<string, string> = {
  Healthy: "bg-[#dcfce7] text-[#166534] dark:bg-[#15803d]/20 dark:text-[#86efac]",
  Warning: "bg-[#fef3c7] text-[#92400e] dark:bg-amber-500/20 dark:text-amber-300",
  Critical:
    "bg-[#fee2e2] text-[#991b1b] dark:bg-red-500/20 dark:text-red-300",
};

export function AnalysisResult({
  analysis,
  onAskDoctor,
}: {
  analysis: PlantAnalysis;
  onAskDoctor: () => void;
}) {
  const a = analysis;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-4 pb-8"
    >
      <Card>
        <CardHeader className="pb-2">
          <Badge className={`w-fit ${statusStyles[a.health_assessment.status]}`}>
            {a.health_assessment.status}
          </Badge>
          <CardTitle className="font-heading text-[30px] leading-tight tracking-tight">
            {a.identification.name}
          </CardTitle>
          <p className="font-medium italic text-muted-foreground">
            {a.identification.scientific_name}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              Confidence
            </p>
            <p className="text-base">{a.identification.confidence}</p>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              Diagnosis
            </p>
            <p className="text-sm leading-relaxed">{a.health_assessment.diagnosis}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Droplets className="h-4 w-4 text-[#15803d]" /> Watering
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">
              {a.care_instructions.watering_frequency}
            </p>
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              Needs water: {a.health_assessment.needs_water ? "Yes" : "No"}
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sprout className="h-4 w-4 text-[#15803d]" /> Soil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{a.care_instructions.soil_type}</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-[#15803d]" /> Light
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{a.light_analysis.current_light}</p>
            <p className="mt-1 text-sm leading-relaxed">
              {a.light_analysis.recommendation}
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <PawPrint className="h-4 w-4 text-[#15803d]" /> Toxicity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{a.care_instructions.toxicity}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Leaf className="h-4 w-4 text-[#15803d]" /> Environmental impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{a.environmental_impact}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Quote className="h-4 w-4 text-[#15803d]" /> Fun fact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{a.fun_fact}</p>
        </CardContent>
      </Card>

      {a.health_assessment.needs_medicine && (
        <Card className="border-[#dc2626]/40">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-base text-[#dc2626]">
              <FlaskConical className="h-4 w-4" /> Needs treatment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{a.health_assessment.diagnosis}</p>
          </CardContent>
        </Card>
      )}

      <button
        onClick={onAskDoctor}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#15803d] px-5 py-3 font-medium text-white transition-transform active:scale-[0.98]"
      >
        <HeartPulse className="h-4 w-4" />
        Ask the Plant Doctor
      </button>
    </motion.div>
  );
}
