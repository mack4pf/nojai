import Image from "next/image";
import { LineChart, ShieldCheck, Wallet } from "lucide-react";

/**
 * Founder section for the About page.
 *
 * The copy's force comes from what it refuses to claim, so the design stays
 * out of its way: no growth charts, no badges, no superlatives. The single
 * visual flourish is the pull quote, because the line about most tests
 * failing is what earns the reader's trust.
 */

const PHOTOS = {
  /** Lead portrait — the most direct eye contact of the four. */
  lead: { src: "/founder/nathaniel-suit-portrait.jpg", alt: "Nathaniel Onoja, founder of NOJAI" },
  full: { src: "/founder/nathaniel-suit-full.jpg", alt: "Nathaniel Onoja" },
  leather: { src: "/founder/nathaniel-leather-portrait.jpg", alt: "Nathaniel Onoja" },
  stairs: { src: "/founder/nathaniel-leather-stairs.jpg", alt: "Nathaniel Onoja" },
};

const PRINCIPLES = [
  {
    icon: LineChart,
    title: "The numbers are published",
    body: "I know exactly what our results are, and I put them where you can read them.",
  },
  {
    icon: ShieldCheck,
    title: "I trade it myself first",
    body: "Nothing runs on your account that hasn't run on mine.",
  },
  {
    icon: Wallet,
    title: "Your money stays yours",
    body: "NOJAI never holds your funds. They sit in your own broker account.",
  },
];

export function FounderProfile() {
  return (
    <section className="relative overflow-hidden border-y border-white/[0.06] bg-[hsl(220_28%_8%)]">
      {/* Warm wash picking up the gold in the photography, so the images feel
          lit by the page rather than pasted onto it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/3 right-0 h-[720px] w-[720px] rounded-full bg-primary/[0.07] blur-[140px]"
      />

      <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
          {/* ---------- Photography ---------- */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.02] shadow-2xl shadow-black/40">
              <Image
                src={PHOTOS.lead.src}
                alt={PHOTOS.lead.alt}
                fill
                priority
                sizes="(min-width: 1024px) 42vw, 100vw"
                className="object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="font-display text-lg font-semibold tracking-tight text-white">
                  Nathaniel Onoja
                </p>
                <p className="text-[13px] text-white/70">Founder &amp; Strategy, NOJAI</p>
              </div>
            </div>

            {/* Staggered so it reads as a contact sheet, not a tidy gallery grid. */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[PHOTOS.full, PHOTOS.leather, PHOTOS.stairs].map((photo, index) => (
                <div
                  key={photo.src}
                  className={`relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] ${
                    index === 1 ? "translate-y-4" : ""
                  }`}
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="(min-width: 1024px) 14vw, 30vw"
                    className="object-cover object-top transition-transform duration-500 hover:scale-[1.06]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ---------- Words ---------- */}
          <div className="lg:pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
              The Founder
            </p>

            <h2 className="mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
              I build the strategies{" "}
              <span className="text-primary">NOJAI runs.</span>
            </h2>

            <p className="mt-7 text-[15px] leading-8 text-muted-foreground sm:text-base">
              My trading journey began in <span className="text-foreground">2018</span>. What I learned
              early is that most trading advice doesn&apos;t survive testing. So I stopped taking advice
              and started testing &mdash; writing my own indicators, pulling years of market data, and
              checking whether an edge held across millions of bars or just looked good on one chart.
            </p>

            {/* The line the whole section rests on. */}
            <figure className="my-8 border-l-2 border-primary/70 pl-5 sm:pl-6">
              <blockquote className="font-display text-xl font-medium leading-relaxed tracking-tight text-foreground sm:text-2xl">
                Most of what I tested failed. A few things didn&apos;t.
              </blockquote>
              <figcaption className="mt-2 text-sm text-muted-foreground">
                Today, those are what NOJAI executes.
              </figcaption>
            </figure>

            <div className="space-y-5 text-[15px] leading-8 text-muted-foreground sm:text-base">
              <p>
                I don&apos;t promise anyone profits &mdash; no honest person would. What I can tell you
                is that I know exactly what our numbers are, I publish them, and I don&apos;t run
                anything on your account that I haven&apos;t run on my own.
              </p>
              <p>
                NOJAI never holds your money. It stays in your broker account, and you can disconnect
                any time.
              </p>
            </div>

            <p className="mt-7 font-display text-lg tracking-tight text-foreground/90">&mdash; Nathaniel</p>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {PRINCIPLES.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 transition-colors hover:border-primary/25"
                >
                  <Icon className="h-[18px] w-[18px] text-primary" />
                  <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
                  <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
