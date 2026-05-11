"use client";

import { Bell, BrainCircuit, ChevronLeft, ChevronRight, Mic } from "lucide-react";
import { useState } from "react";
import { completeOnboarding } from "@/app/actions";
import { LogoMark } from "@/components/logo-mark";

const steps = [
  {
    icon: Mic,
    title: "Speak your first task",
    description:
      "Just talk naturally. Zantalk listens and captures your task instantly.",
  },
  {
    icon: BrainCircuit,
    title: "AI organizes it automatically",
    description:
      "Zantalk extracts the task, date, time, and reminder using AI.",
  },
  {
    icon: Bell,
    title: "Never forget important tasks again",
    description:
      "Get reminders and stay on top of your work and personal tasks.",
  },
];

export function OnboardingFlow() {
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const Icon = step.icon;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden px-5 py-5">
      <header className="flex items-center justify-between">
        <LogoMark size={42} />
        <form action={completeOnboarding}>
          <button
            type="submit"
            className="tap-highlight rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-blue-200/30 hover:text-blue-100"
          >
            Skip
          </button>
        </form>
      </header>

      <section className="flex flex-1 flex-col justify-center py-8">
        <div className="relative mx-auto mb-9 flex h-44 w-44 items-center justify-center rounded-full border border-blue-200/15 bg-blue-300/[0.04] shadow-[0_0_72px_rgba(88,173,255,0.22)]">
          <div className="absolute inset-5 rounded-full border border-blue-200/10" />
          <div className="absolute inset-10 rounded-full bg-blue-300/10 blur-2xl" />
          <div
            key={step.title}
            className="relative grid h-24 w-24 animate-[zantalk-onboarding-in_420ms_ease-out] place-items-center rounded-[8px] border border-blue-200/20 bg-slate-950/80 text-blue-100 blue-glow"
          >
            <Icon size={42} strokeWidth={1.7} />
          </div>
        </div>

        <div
          key={`${step.title}-copy`}
          className="animate-[zantalk-onboarding-in_420ms_ease-out] text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-blue-100">
            {stepIndex + 1}/{steps.length}
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-white">
            {step.title}
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-base leading-7 text-slate-400">
            {step.description}
          </p>
        </div>

        <div className="mt-9 flex justify-center gap-2">
          {steps.map((item, index) => (
            <button
              key={item.title}
              type="button"
              aria-label={`Go to onboarding step ${index + 1}`}
              onClick={() => setStepIndex(index)}
              className={
                index === stepIndex
                  ? "h-2.5 w-8 rounded-full bg-blue-100 shadow-[0_0_18px_rgba(140,200,255,0.75)] transition-all"
                  : "h-2.5 w-2.5 rounded-full bg-white/20 transition-all hover:bg-white/40"
              }
            />
          ))}
        </div>
      </section>

      <footer className="grid gap-3 pb-2">
        {isLast ? (
          <form action={completeOnboarding}>
            <button
              type="submit"
              className="tap-highlight inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[8px] bg-white px-5 text-base font-bold text-slate-950 shadow-[0_0_36px_rgba(140,200,255,0.22)] transition hover:bg-blue-50"
            >
              Get Started
              <ChevronRight size={18} />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setStepIndex((current) => current + 1)}
            className="tap-highlight inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[8px] bg-white px-5 text-base font-bold text-slate-950 shadow-[0_0_36px_rgba(140,200,255,0.22)] transition hover:bg-blue-50"
          >
            Next
            <ChevronRight size={18} />
          </button>
        )}
        <button
          type="button"
          disabled={isFirst}
          onClick={() => setStepIndex((current) => current - 1)}
          className="tap-highlight inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.03] px-5 text-sm font-semibold text-slate-200 transition hover:border-white/20 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft size={17} />
          Back
        </button>
      </footer>
    </main>
  );
}
