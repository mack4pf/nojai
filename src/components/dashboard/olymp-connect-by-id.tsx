"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

/**
 * Connects an Olymp account the user already has, using its numeric id.
 *
 * For people who joined Olymp through our link before the partner flow
 * existed. No broker password is involved at any point — the connection is
 * made with our own partner credentials, so there is nothing for us to store
 * and nothing to expire.
 *
 * The balance field is the ownership proof: Olymp will tell us whether an
 * account belongs to NOJAI, but never whether it belongs to the person
 * asking, and an id on its own is not a secret.
 */

interface PartnerStatus {
  linked: boolean;
  olympUserId?: number;
  accounts?: Array<{ id: number; type: "real" | "demo"; currency: string; balance: number }>;
}

export function OlympConnectById() {
  const queryClient = useQueryClient();
  const [olympUserId, setOlympUserId] = useState("");
  const [confirmBalance, setConfirmBalance] = useState("");

  const { data: status, isLoading } = useQuery<PartnerStatus>({
    queryKey: ["olymp-partner-status"],
    queryFn: async () => (await api.get("/olymp-partner/status")).data as PartnerStatus,
  });

  const claim = useMutation({
    mutationFn: async (payload: { olympUserId: number; confirmBalance: number }) =>
      (await api.post("/olymp-partner/claim", payload)).data,
    onSuccess: () => {
      toast.success("Olymp account connected. Turn on automated trading when you're ready.");
      setOlympUserId("");
      setConfirmBalance("");
      void queryClient.invalidateQueries({ queryKey: ["olymp-partner-status"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) return null;

  if (status?.linked) {
    const real = status.accounts?.find((account) => account.type === "real");
    return (
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <div className="min-w-0">
            <p className="text-sm font-medium">Olymp account connected</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Account #{status.olympUserId}
              {real ? <> · balance {formatCurrency(real.balance, real.currency)}</> : null}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const idValue = Number(olympUserId);
  const balanceValue = Number(confirmBalance);
  const canSubmit =
    Number.isInteger(idValue) && idValue > 0
    && Number.isFinite(balanceValue) && balanceValue >= 0
    && !claim.isPending;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <p className="text-sm font-medium">Connect your Olymp account</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        If you already have an Olymp Trade account opened through NOJAI, connect it with your account ID.
        No Olymp password needed.
      </p>

      <form
        className="mt-4 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          claim.mutate({ olympUserId: idValue, confirmBalance: balanceValue });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="olymp-uid" className="text-xs">Olymp account ID</Label>
            <Input
              id="olymp-uid"
              inputMode="numeric"
              value={olympUserId}
              onChange={(event) => setOlympUserId(event.target.value.replace(/[^0-9]/g, ""))}
              placeholder="138845680"
              className="mt-1.5"
            />
            <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
              On Olymp, open your profile — it&apos;s the numeric ID shown there.
            </p>
          </div>

          <div>
            <Label htmlFor="olymp-balance" className="text-xs">Your real account balance</Label>
            <Input
              id="olymp-balance"
              type="number"
              step="0.01"
              min={0}
              value={confirmBalance}
              onChange={(event) => setConfirmBalance(event.target.value)}
              placeholder="0.00"
              className="mt-1.5"
            />
            <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
              Exactly as Olymp shows it. This confirms the account is yours.
            </p>
          </div>
        </div>

        <div className="flex gap-2 rounded-xl border border-white/[0.06] bg-black/20 p-3 text-[11px] leading-5 text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Only accounts opened through NOJAI&apos;s Olymp link can be connected. Your money stays in your
            own Olymp account, and automated trading stays off until you switch it on.
          </span>
        </div>

        <Button type="submit" disabled={!canSubmit}>
          {claim.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Connect account
        </Button>
      </form>
    </div>
  );
}
