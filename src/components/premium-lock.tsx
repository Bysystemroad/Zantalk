import Link from "next/link";
import { LockKeyhole } from "lucide-react";

export function PremiumLock({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-[8px] border border-blue-200/15 bg-blue-300/10 p-4 shadow-[0_0_34px_rgba(88,173,255,0.12)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="rounded-full border border-blue-100/20 bg-white/10 p-2 text-blue-100">
          <LockKeyhole size={18} />
        </div>
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-semibold text-slate-300">
          Premium
        </span>
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 min-h-10 text-sm leading-5 text-slate-400">
        {description}
      </p>
      <Link
        href="/pricing"
        className="tap-highlight mt-4 inline-flex w-full items-center justify-center rounded-[8px] bg-white px-4 py-3 text-sm font-bold text-slate-950"
      >
        Unlock Premium
      </Link>
    </article>
  );
}
