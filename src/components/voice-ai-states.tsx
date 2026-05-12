"use client";

import { BrainCircuit, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

export type AiProcessingStep = "understood" | "analyzing" | "ready";

const processingCopy: Record<AiProcessingStep, { label: string; detail: string }> = {
  understood: {
    label: "Understood",
    detail: "Voice captured",
  },
  analyzing: {
    label: "Analyzing your task...",
    detail: "Extracting date, time, and reminder",
  },
  ready: {
    label: "Task ready",
    detail: "Review the details",
  },
};

export function AiProcessingState({ step }: { step: AiProcessingStep }) {
  const copy = processingCopy[step];

  return (
    <div className="grid place-items-center text-center">
      <div className="relative mb-9 flex h-56 w-56 items-center justify-center rounded-full border border-blue-200/15 bg-blue-300/10 shadow-[0_0_90px_rgba(88,173,255,0.34)]">
        <span className="absolute h-40 w-40 rounded-full border border-blue-200/20 animate-[zantalk-ai-ring_1.8s_ease-in-out_infinite]" />
        <span className="absolute h-28 w-28 rounded-full border border-blue-100/15 animate-[zantalk-ai-ring_1.8s_ease-in-out_infinite_250ms]" />
        <span className="absolute h-24 w-24 rounded-full bg-blue-300/15 blur-2xl" />
        <div className="relative grid h-24 w-24 place-items-center rounded-[8px] border border-blue-200/25 bg-slate-950/90 text-blue-100 blue-glow">
          <BrainCircuit
            size={44}
            strokeWidth={1.7}
            className="animate-[zantalk-ai-pulse_1.2s_ease-in-out_infinite]"
          />
        </div>
      </div>
      <p
        key={copy.label}
        className="animate-[zantalk-onboarding-in_320ms_ease-out] text-sm font-semibold uppercase tracking-[0.34em] text-blue-100"
      >
        {copy.label}
      </p>
      <p
        key={copy.detail}
        className="mt-5 max-w-72 animate-[zantalk-onboarding-in_320ms_ease-out] text-2xl font-semibold leading-tight text-white"
      >
        {copy.detail}
      </p>
    </div>
  );
}

export function TaskCreatedState({ children }: { children?: ReactNode }) {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-md place-items-center px-5 py-6 text-center">
      <section className="grid place-items-center">
        <div className="relative mb-9 grid h-44 w-44 place-items-center rounded-full border border-emerald-200/20 bg-emerald-300/10 shadow-[0_0_80px_rgba(52,211,153,0.24)]">
          <span className="absolute h-32 w-32 rounded-full border border-emerald-200/20 animate-[zantalk-success-ring_1.4s_ease-out_infinite]" />
          <CheckCircle2
            size={72}
            strokeWidth={1.6}
            className="text-emerald-100 animate-[zantalk-success-pop_520ms_ease-out]"
          />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.34em] text-emerald-100">
          Task created
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-white">Saved to Zantalk</h1>
        {children}
      </section>
    </main>
  );
}
