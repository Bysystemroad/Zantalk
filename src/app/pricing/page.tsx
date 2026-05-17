import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Infinity,
  Sparkles,
} from "lucide-react";
import { LogoMark } from "@/components/logo-mark";

const freeFeatures = [
  "3 voice tasks per day",
  "Basic reminders",
  "Multi-language support",
  "Basic task list",
];

const premiumFeatures = [
  "Unlimited voice tasks",
  "Google Calendar Sync",
  "Smart Follow-up Engine",
  "AI Categorization",
  "Task Summaries",
  "Smart Reminders",
];

export default function PricingPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-6 md:px-8">
      <header className="flex items-center justify-between">
        <LogoMark size={42} />
        <Link
          href="/app"
          className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200"
        >
          Open app
        </Link>
      </header>

      <section className="py-14 text-center md:py-20">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/15 bg-blue-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-blue-100">
          <Sparkles size={15} />
          Zantalk Premium
        </p>
        <h1 className="mx-auto max-w-3xl text-5xl font-semibold leading-tight text-white md:text-6xl">
          Start free. Upgrade when voice becomes your workflow.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300">
          Free reminds you. Premium helps you act with unlimited capture,
          calendar sync, and Smart Follow-up Engine.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="glass rounded-[8px] p-6">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-white">Free</h2>
              <p className="mt-2 text-sm text-slate-400">
                For trying Zantalk and light daily capture.
              </p>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-sm font-semibold text-slate-300">
              €0
            </span>
          </div>

          <ul className="grid gap-3">
            {freeFeatures.map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-3 text-sm text-slate-300"
              >
                <CheckCircle2 size={17} className="text-blue-100" />
                {feature}
              </li>
            ))}
          </ul>

          <Link
            href="/login"
            className="tap-highlight mt-8 inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-white/10 px-5 py-4 text-base font-bold text-white"
          >
            Start Free
            <ArrowRight size={18} />
          </Link>
        </article>

        <article className="relative overflow-hidden rounded-[8px] border border-blue-200/25 bg-blue-300/10 p-6 shadow-[0_0_90px_rgba(88,173,255,0.18)]">
          <div className="absolute right-0 top-0 h-44 w-44 bg-blue-300/15 blur-3xl" />
          <div className="relative">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">Premium</h2>
                <p className="mt-2 text-sm text-slate-300">
                  For unlimited voice capture and smarter follow-through.
                  Free reminds you. Premium helps you act.
                </p>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-950">
                Best
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[8px] border border-white/10 bg-white/[0.06] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Monthly
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  €4.99
                </p>
              </div>
              <div className="rounded-[8px] border border-white/10 bg-white/[0.06] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Yearly
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  €29.99
                </p>
              </div>
            </div>

            <ul className="mt-6 grid gap-3">
              {premiumFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-3 text-sm text-slate-200"
                >
                  <CheckCircle2 size={17} className="text-blue-100" />
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href="/login"
              className="tap-highlight mt-8 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-white px-5 py-4 text-base font-bold text-slate-950"
            >
              <Infinity size={18} />
              Upgrade to Premium
            </Link>
            <p className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
              <CalendarDays size={14} />
              Stripe or RevenueCat checkout plugs in here later.
            </p>
          </div>
        </article>
      </section>
    </main>
  );
}
