import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  GraduationCap,
  Layers3,
  MessageSquareText,
  Mic2,
  Sparkles,
  UserRound,
} from "lucide-react";
import { LogoMark } from "@/components/logo-mark";

const howItWorks = [
  { label: "Speak", icon: Mic2 },
  { label: "AI understands", icon: Brain },
  { label: "Task created", icon: CheckCircle2 },
];

const reasons = [
  { title: "No typing", body: "Capture the thought before it disappears." },
  { title: "Instant capture", body: "Record, parse, confirm, and move on." },
  {
    title: "Smart task structure",
    body: "Date, time, person, category, and reminder arrive organized.",
  },
];

const useCases = [
  { label: "Work follow-ups", icon: Briefcase },
  { label: "Meetings", icon: UserRound },
  { label: "Personal reminders", icon: CalendarCheck },
  { label: "Study planning", icon: GraduationCap },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <div className="mx-auto w-full max-w-6xl px-5 py-6 md:px-8">
        <header className="flex items-center justify-between">
          <LogoMark size={42} />
          <Link
            href="/login"
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-blue-200/40 hover:text-white"
          >
            Login
          </Link>
        </header>

        <section className="grid min-h-[calc(100vh-5.5rem)] items-center gap-12 py-14 md:grid-cols-[1fr_0.9fr] md:py-20">
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/15 bg-blue-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-blue-100">
              <Sparkles size={15} />
              Voice-first AI task assistant
            </p>
            <h1 className="text-5xl font-semibold leading-[0.98] text-white md:text-7xl">
              Turn your voice into action.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 md:text-lg">
              Zantalk converts your thoughts into organized tasks with AI.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="tap-highlight inline-flex items-center justify-center gap-2 rounded-[8px] bg-white px-6 py-4 text-base font-bold text-slate-950 shadow-[0_0_44px_rgba(140,200,255,0.22)]"
              >
                Start free
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/app"
                className="tap-highlight inline-flex items-center justify-center rounded-[8px] border border-white/10 px-6 py-4 text-base font-semibold text-white"
              >
                Open app
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[23rem]">
            <div className="absolute inset-8 rounded-full bg-blue-300/20 blur-3xl" />
            <div className="relative rounded-[2.3rem] border border-blue-100/20 bg-[#07101d] p-3 shadow-[0_0_90px_rgba(88,173,255,0.22)]">
              <div className="rounded-[1.8rem] border border-white/10 bg-[#05070c] px-5 py-6">
                <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-white/15" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">
                    Zantalk
                  </span>
                  <span className="rounded-full bg-blue-300/10 px-3 py-1 text-xs text-blue-100">
                    Live
                  </span>
                </div>

                <div className="mt-8 rounded-[8px] border border-blue-100/15 bg-blue-300/10 p-4">
                  <div className="mb-4 flex h-28 items-center justify-center gap-2">
                    <span className="wave-bar h-10" />
                    <span className="wave-bar h-20" />
                    <span className="wave-bar h-14" />
                    <span className="wave-bar h-24" />
                    <span className="wave-bar h-12" />
                  </div>
                  <p className="text-center text-sm text-slate-300">
                    &quot;Tomorrow at 3 call Cem&quot;
                  </p>
                </div>

                <div className="my-5 flex justify-center text-blue-100">
                  <ArrowRight size={22} />
                </div>

                <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    Task created
                  </p>
                  <h3 className="mt-3 text-xl font-semibold text-white">
                    Call Cem
                  </h3>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <span className="rounded-[8px] bg-white/[0.05] px-3 py-2 text-slate-300">
                      Tomorrow
                    </span>
                    <span className="rounded-[8px] bg-white/[0.05] px-3 py-2 text-slate-300">
                      15:00
                    </span>
                    <span className="rounded-[8px] bg-white/[0.05] px-3 py-2 text-slate-300">
                      Work
                    </span>
                    <span className="rounded-[8px] bg-white/[0.05] px-3 py-2 text-slate-300">
                      30 min
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-blue-100">
            How it works
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {howItWorks.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="glass rounded-[8px] p-5">
                  <Icon className="mb-8 text-blue-100" size={24} />
                  <p className="text-xl font-semibold text-white">
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-8 py-14 md:grid-cols-[0.8fr_1.2fr] md:items-start">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-blue-100">
              Why Zantalk
            </p>
            <h2 className="text-4xl font-semibold leading-tight text-white">
              Built for thoughts that move faster than typing.
            </h2>
          </div>
          <div className="grid gap-3">
            {reasons.map((reason) => (
              <div
                key={reason.title}
                className="rounded-[8px] border border-white/10 bg-white/[0.035] p-5"
              >
                <h3 className="text-lg font-semibold text-white">
                  {reason.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {reason.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-14">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-blue-100">
            Use cases
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {useCases.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-[8px] border border-white/10 bg-white/[0.035] p-5"
                >
                  <Icon className="mb-8 text-blue-100" size={24} />
                  <p className="text-sm font-semibold text-white">
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="py-14">
          <div className="glass relative overflow-hidden rounded-[8px] p-8 md:p-10">
            <div className="absolute right-0 top-0 h-40 w-40 bg-blue-300/10 blur-3xl" />
            <Layers3 className="mb-8 text-blue-100" size={28} />
            <h2 className="max-w-2xl text-4xl font-semibold leading-tight text-white">
              Not just reminders.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
              Zantalk understands and organizes your tasks. Free reminds you.
              Premium helps you act.
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
              Smart Follow-up Engine does more than remind you. When a task is
              due or overdue, it suggests the next message or action so you can
              move faster.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-blue-200/15 bg-blue-300/10 px-4 py-2 text-sm font-semibold text-blue-100">
              <MessageSquareText size={16} />
              Smart Follow-up Engine
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-4 border-t border-white/10 py-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <LogoMark size={34} />
          <p>Voice-first AI task assistant.</p>
          <Link href="/login" className="font-semibold text-slate-300">
            Start free
          </Link>
        </footer>
      </div>
    </main>
  );
}
