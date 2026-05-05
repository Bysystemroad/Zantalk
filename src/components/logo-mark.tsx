import Image from "next/image";

type LogoMarkProps = {
  size?: number;
  showName?: boolean;
};

export function LogoMark({ size = 44, showName = true }: LogoMarkProps) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/logo-icon.png"
        alt="Zantalk logo"
        width={size}
        height={size}
        className="rounded-[12px] border border-white/10 shadow-[0_0_24px_rgba(140,200,255,0.18)]"
        priority
      />
      {showName ? (
        <span className="text-lg font-semibold tracking-[0.28em] text-white">
          ZANTALK
        </span>
      ) : null}
    </div>
  );
}
