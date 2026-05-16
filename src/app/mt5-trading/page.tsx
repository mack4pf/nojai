import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Zap, MousePointer2, Settings2, TrendingUp, HelpCircle } from "lucide-react";

import { MarketingShell } from "@/components/layout/marketing-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "How to Connect MT5 — NOJAI",
  description: "Learn how to connect your MetaTrader 5 account to NOJAI for automated forex trading and copy trading.",
};

export default function Mt5TradingPage() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden bg-background text-foreground">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
        <div className="mx-auto max-w-7xl px-6 py-20 lg:grid lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-32 relative z-10">
          <div className="flex flex-col justify-center">
            <Badge variant="outline" className="mb-6 w-fit border-primary/20 text-primary">Forex & Gold Automation</Badge>
            <h1 className="font-display text-5xl font-black leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              Connect MT5. <br />
              <span className="text-primary">Automate</span> results.
            </h1>
            <p className="mt-8 text-lg leading-8 text-muted-foreground max-w-xl">
              NOJAI brings professional-grade automation to any MT5 broker. Connect in seconds, set your risk, and let the bot handle the execution 24/7.
            </p>
            
            <div className="mt-10 flex flex-wrap gap-4">
              <Button asChild size="lg" className="h-14 px-8 text-lg font-bold">
                <Link href="/auth/register">
                  Connect Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="h-14 px-8 text-lg font-bold">
                <Link href="#steps">How it works</Link>
              </Button>
            </div>

            <div className="mt-12 flex items-center gap-8 border-t border-border pt-10">
              <div>
                <p className="text-3xl font-black">24/7</p>
                <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground">Market Monitoring</p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div>
                <p className="text-3xl font-black">0.1s</p>
                <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground">Execution Speed</p>
              </div>
            </div>
          </div>

          <div className="mt-16 lg:mt-0 flex items-center">
            <div className="relative group w-full">
              <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-tr from-primary/30 to-blue-500/30 blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000" />
              <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl">
                <Image
                  src="/autobot-assets/mt5-guide-1.png"
                  alt="MT5 Trading Interface"
                  width={1200}
                  height={800}
                  className="w-full object-cover transform hover:scale-105 transition duration-700"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="steps" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="flex flex-col items-center text-center mb-20">
          <Badge variant="secondary" className="mb-4">Setup Guide</Badge>
          <h2 className="font-display text-4xl font-black tracking-tight sm:text-6xl">Simple 3-step connection</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl">No complex setup. No coding required. Just your server and login details.</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Find Your Server",
              description: "Search for your broker's server name exactly as it appears in your MT5 mobile app.",
              icon: Settings2,
              color: "text-blue-500"
            },
            {
              step: "02",
              title: "Enter Credentials",
              description: "Input your MT5 account number and password. Connections are encrypted and secure.",
              icon: ShieldCheck,
              color: "text-emerald-500"
            },
            {
              step: "03",
              title: "Start Mirroring",
              description: "Select a provider to copy or connect your own TradingView webhook signals.",
              icon: Zap,
              color: "text-amber-500"
            }
          ].map((item) => (
            <div key={item.step} className="group relative">
               <div className="absolute -inset-2 rounded-[2rem] bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500" />
               <Card className="relative h-full overflow-hidden border-border bg-card hover:border-primary/50 transition-colors">
                  <CardContent className="p-10">
                    <div className="mb-8 flex items-center justify-between">
                      <div className={`rounded-2xl bg-muted p-4 shadow-inner ${item.color}`}>
                        <item.icon className="h-7 w-7" />
                      </div>
                      <span className="text-5xl font-black opacity-5 select-none">{item.step}</span>
                    </div>
                    <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                  </CardContent>
               </Card>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-muted/30 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div className="relative order-2 lg:order-1">
              <div className="absolute -inset-4 rounded-[3rem] bg-emerald-500/10 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card shadow-2xl">
                <Image
                  src="/autobot-assets/forex-setup1.png"
                  alt="Secure Connection Visual"
                  width={1000}
                  height={1000}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <Badge variant="outline" className="mb-6 border-emerald-500/20 text-emerald-500 font-bold uppercase tracking-widest">Premium Execution</Badge>
              <h2 className="font-display text-4xl font-black tracking-tight sm:text-5xl">Professional-grade speed for every account.</h2>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                Our enterprise infrastructure ensures your MT5 trades are executed with zero lag. We support major pairs, gold, and indices across all brokers.
              </p>
              
              <ul className="mt-10 space-y-6">
                {[
                  "Mirror manual trades from your MT5 app instantly",
                  "Fixed dollar risk management for every trade",
                  "Real-time profit tracking and balance sync",
                  "Universal broker support (Exness, HFM, IC Markets, etc.)"
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-4">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <span className="text-lg font-medium">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-12 flex items-center gap-10">
                <div className="flex flex-col">
                  <span className="text-3xl font-black">15k+</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black">Trades Done</span>
                </div>
                <div className="h-12 w-px bg-border" />
                <div className="flex flex-col">
                  <span className="text-3xl font-black">120+</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black">MT5 Accounts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="relative overflow-hidden rounded-[3rem] bg-primary px-8 py-20 text-center text-primary-foreground sm:px-16 shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_40%)]" />
          <div className="relative z-10 mx-auto max-w-3xl">
            <h2 className="font-display text-5xl font-black tracking-tight sm:text-7xl">Ready to automate?</h2>
            <p className="mt-8 text-xl opacity-90 max-w-xl mx-auto leading-relaxed">Join the next generation of MT5 traders. Simple setup, professional results.</p>
            <div className="mt-12 flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" variant="secondary" className="h-16 px-12 text-xl font-black shadow-lg hover:scale-105 transition transform">
                <Link href="/auth/register">Get Started Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
