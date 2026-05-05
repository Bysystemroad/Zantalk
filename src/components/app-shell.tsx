import { BottomNav } from "@/components/bottom-nav";
import { LogoMark } from "@/components/logo-mark";
import { logout } from "@/app/actions";

export function AppShell({
  children,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-5">
      <header className="relative mb-7 flex items-center justify-center">
        <LogoMark size={42} />
        <form action={logout}>
          <button
            type="submit"
            className="tap-highlight absolute right-0 top-1/2 -translate-y-1/2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-slate-400"
          >
            Out
          </button>
        </form>
      </header>
      {children}
      <BottomNav />
    </main>
  );
}
