import Image from "next/image";

interface LogoLoaderProps {
  label?: string;
}

export function LogoLoader({ label = "Loading NOJAI" }: LogoLoaderProps) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-6 py-16">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <div className="animate-nojai-orbit absolute inset-0 rounded-full border border-primary/20 border-t-primary/70" />
        <div className="animate-nojai-fade relative h-20 w-20 overflow-hidden rounded-[1.4rem] border border-white/10 bg-card shadow-glow">
          <Image
            src="/logo.jpg"
            alt="NOJAI"
            fill
            sizes="80px"
            className="object-cover"
            priority
          />
        </div>
      </div>
      <div className="space-y-2 text-center">
        <p className="font-display text-2xl font-semibold text-foreground">NOJAI</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}