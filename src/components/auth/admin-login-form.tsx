"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password is required"),
});

type Values = z.infer<typeof schema>;

export function AdminLoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: Values) {
    setBusy(true);
    const result = await signIn("admin-credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });
    setBusy(false);

    if (result?.error) {
      toast.error("Invalid credentials");
      return;
    }

    toast.success("Welcome back, admin");
    router.push("/admin");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Administrator Access</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="adm-email">Email</Label>
            <Input id="adm-email" type="email" autoComplete="username" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="adm-password">Password</Label>
            <div className="relative">
              <Input
                id="adm-password"
                type={show ? "text" : "password"}
                className="pr-12"
                autoComplete="current-password"
                {...form.register("password")}
              />
              <button
                type="button"
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShow((v) => !v)}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
