import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface WorkflowShowcaseProps {
  eyebrow?: string;
  title: string;
  description: string;
}

const workflowNotes = [
  "TradingView sends the signal to NOJAI.",
  "NOJAI checks the alert and trade rules before placing an order.",
  "Your connected broker (MT5, IQ Option, etc.) executes the order.",
];

export function WorkflowShowcase({ eyebrow = "Workflow", title, description }: WorkflowShowcaseProps) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
      <div className="glass-panel overflow-hidden rounded-[2rem] p-6 sm:p-8 lg:p-10">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="outline">{eyebrow}</Badge>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">{title}</h2>
          <p className="mt-4 text-base font-medium leading-8 text-muted-foreground sm:text-lg">{description}</p>
        </div>

        <div className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-black/25 p-3 shadow-[0_18px_44px_rgba(0,0,0,0.18)] sm:p-4">
          <Image
            src="/flow.jpg"
            alt="NOJAI trade flow"
            width={1536}
            height={1536}
            className="h-auto w-full rounded-[1.5rem] object-cover"
            priority
          />
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">What This Shows</p>
            <p className="mt-3 text-base font-semibold leading-8 text-foreground">
              The image shows how a signal moves from TradingView to NOJAI and then to your chosen broker.
            </p>
          </div>

          <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Workflow Summary</p>
            <ul className="mt-4 space-y-3">
              {workflowNotes.map((note) => (
                <li key={note} className="flex items-start gap-3 text-sm font-medium leading-7 text-muted-foreground sm:text-base">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}