import type { Metadata } from "next";

import Link from "next/link";

import { Mail, MessageCircleMore, UserCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact NOJAI — Get Help & Support",
  description:
    "Have a question or need support? Reach out to the NOJAI team via email, Telegram, or social media and we'll get back to you quickly.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact NOJAI — Get Help & Support",
    description: "Have a question or need support? Reach out to the NOJAI team and we'll get back to you quickly.",
    url: "/contact",
  },
};

import { MarketingShell } from "@/components/layout/marketing-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { contactChannels } from "@/lib/marketing";

const icons = [Mail, UserCircle2, MessageCircleMore] as const;

export default function ContactPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="max-w-3xl">
          <Badge>Contact Us</Badge>
          <h1 className="mt-6 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
            Talk to the NOJAI team
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Need help with your account, setup, pricing, or support? Reach out here and we will guide you.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {contactChannels.map((channel, index) => {
            const Icon = icons[index] ?? Mail;

            return (
              <Card key={channel.title} className="h-full">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="pt-4">{channel.title}</CardTitle>
                  <CardDescription>{channel.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-medium text-foreground">{channel.value}</p>
                  <Button asChild variant="outline" className="mt-6 w-full">
                    <Link href={channel.href}>Open</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-12 border-primary/20 bg-gradient-to-r from-primary/10 via-transparent to-accent/10">
          <CardContent className="flex flex-col gap-4 p-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-primary">Need a place to start?</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">Create your account and get started</h2>
            </div>
            <Button asChild size="lg">
              <Link href="/auth/register">Create account</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </MarketingShell>
  );
}