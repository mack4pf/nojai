"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  Settings, 
  ShieldCheck,
  Zap,
  MousePointer2,
  UserPlus,
  ArrowRight,
  TrendingDown,
  Edit2,
  HelpCircle,
  Search,
  Key,
  Copy
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { MetaTrader5Icon } from "@/components/icons/metatrader5-icon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Mt5Account {
  _id: string;
  brokerName: string;
  serverName: string;
  login: string;
  accountType: "demo" | "real";
  copyProviderEnabled?: boolean;
  copyProviderName?: string;
  copyManualTrades?: boolean;
  copyWebhookSignals?: boolean;
}

interface Mt5CopyRelationship {
  _id: string;
  status: "pending" | "active" | "rejected" | "cancelled";
  requestedBy: "provider" | "follower";
  copyManualTrades: boolean;
  copyWebhookSignals: boolean;
  riskType: "multiplier" | "fixed";
  lotMultiplier: number;
  riskAmountUsd: number;
  provider?: { email?: string; fullName?: string } | null;
  follower?: { email?: string; fullName?: string } | null;
  providerAccount?: { login?: string; brokerName?: string; copyProviderName?: string } | null;
}

interface Mt5CopyTradingStatus {
  canProvide: boolean;
  accounts: Mt5Account[];
  providing: Mt5CopyRelationship[];
  copying: Mt5CopyRelationship[];
}

export function Mt5CopyTradingSection() {
  const queryClient = useQueryClient();
  const [providerEmail, setProviderEmail] = useState("");
  const [riskAmount, setRiskAmount] = useState(10);
  const [editingRisk, setEditingRisk] = useState<{ id: string; amount: number } | null>(null);

  const { data: copyStatus, isLoading } = useQuery({
    queryKey: ["mt5-copy-trading"],
    queryFn: async () => (await api.get<Mt5CopyTradingStatus>("/mt5/copy-trading")).data,
    refetchInterval: 15_000,
  });

  const providerMutation = useMutation({
    mutationFn: async ({ accountId, values }: { accountId: string; values: Partial<Mt5Account> }) => {
      await api.patch(`/mt5/copy-trading/provider/accounts/${accountId}`, values);
    },
    onSuccess: () => {
      toast.success("Settings updated");
      queryClient.invalidateQueries({ queryKey: ["mt5-copy-trading"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Update failed"),
  });

  const copyRequestMutation = useMutation({
    mutationFn: async () => {
      await api.post("/mt5/copy-trading/requests", {
        providerEmail,
        followerAccountId: copyStatus?.accounts[0]?._id,
        riskType: "fixed",
        riskAmountUsd: riskAmount,
      });
    },
    onSuccess: () => {
      toast.success("Request sent to " + providerEmail);
      setProviderEmail("");
      queryClient.invalidateQueries({ queryKey: ["mt5-copy-trading"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Request failed"),
  });

  const relationshipMutation = useMutation({
    mutationFn: async ({ id, action, values }: { id: string; action?: string; values?: any }) => {
      if (action) {
        await api.patch(`/mt5/copy-trading/requests/${id}`, { action });
      } else if (values) {
        await api.patch(`/mt5/copy-trading/relationships/${id}`, values);
      }
    },
    onSuccess: () => {
      toast.success("Updated successfully");
      setEditingRisk(null);
      queryClient.invalidateQueries({ queryKey: ["mt5-copy-trading"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Update failed"),
  });

  if (isLoading) return <div className="py-10 text-center text-xs text-muted-foreground">Loading...</div>;

  const activeAccount = copyStatus?.accounts[0];
  const isProviding = activeAccount?.copyProviderEnabled ?? false;
  const canProvide = copyStatus?.canProvide ?? false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MetaTrader5Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">MT5 Copy Trading</h2>
            <p className="text-xs text-muted-foreground">Share trades with others or follow a professional trader.</p>
          </div>
        </div>
        <Dialog>
           <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2 rounded-full border-primary/20 text-[10px] font-bold uppercase hover:bg-primary/5">
                 <HelpCircle className="h-3.5 w-3.5" />
                 How to connect
              </Button>
           </DialogTrigger>
           <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                 <DialogTitle className="text-xl font-bold">Connecting your MT5 Account</DialogTitle>
              </DialogHeader>
              <div className="space-y-8 py-4">
                 <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                       <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 font-bold">1</div>
                          <h4 className="font-bold">Find Your Broker Server</h4>
                       </div>
                       <p className="text-xs text-muted-foreground leading-relaxed">
                          Open your MT5 mobile app, go to **Settings** → **New Account**, and search for your broker. Copy the **Server Name** exactly as it appears (e.g., *Exness-MT5Real*).
                       </p>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
                       <Image src="/autobot-assets/mt5-guide-1.png" alt="Find Server" width={400} height={250} className="w-full" />
                    </div>
                 </div>

                 <div className="grid gap-6 md:grid-cols-2">
                    <div className="order-2 md:order-1 flex items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-6">
                       <div className="flex flex-col items-center gap-2 text-center">
                          <Key className="h-8 w-8 text-primary opacity-50" />
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Secure Credentials</p>
                       </div>
                    </div>
                    <div className="order-1 md:order-2 space-y-4">
                       <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 font-bold">2</div>
                          <h4 className="font-bold">Enter Account Details</h4>
                       </div>
                       <p className="text-xs text-muted-foreground leading-relaxed">
                          Enter your MT5 **Login ID** and **Trading Password**. We use industry-standard encryption to ensure your data is always protected.
                       </p>
                    </div>
                 </div>

                 <div className="rounded-2xl bg-primary/5 p-6 border border-primary/10">
                    <div className="flex items-center gap-3 mb-4">
                       <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 font-bold">3</div>
                       <h4 className="font-bold">Start Copy Trading</h4>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                       <div className="rounded-xl bg-background p-4 border border-border">
                          <div className="flex items-center gap-2 mb-2">
                             <Copy className="h-4 w-4 text-blue-500" />
                             <span className="text-xs font-bold uppercase">Follower Mode</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">Request access to a pro trader by entering their email. Set your risk per trade ($) and click Connect.</p>
                       </div>
                       <div className="rounded-xl bg-background p-4 border border-border">
                          <div className="flex items-center gap-2 mb-2">
                             <Zap className="h-4 w-4 text-amber-500" />
                             <span className="text-xs font-bold uppercase">Provider Mode</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">Enable Provider Mode if you are VIP. Your followers will automatically copy your manual trades and signals.</p>
                       </div>
                    </div>
                 </div>
              </div>
           </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* STEP 1: BECOME A PROVIDER (FOR VIP) */}
        <div className="flex flex-col rounded-[1.5rem] border border-white/[0.08] bg-white/[0.02] p-5">
           <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                  <Users className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold">1. Enable Providing</h3>
              </div>
              {canProvide ? (
                <Switch 
                  checked={isProviding} 
                  onCheckedChange={(checked) => activeAccount && providerMutation.mutate({ 
                    accountId: activeAccount._id, 
                    values: { copyProviderEnabled: checked } 
                  })}
                />
              ) : (
                <Badge variant="warning" className="text-[9px]">VIP Required</Badge>
              )}
           </div>

           {!canProvide ? (
             <div className="mt-4 flex-1 rounded-xl bg-amber-500/5 p-4 text-center">
                <ShieldCheck className="mx-auto mb-2 h-5 w-5 text-amber-500" />
                <p className="text-[11px] font-medium text-amber-200/80">Only VIP users can be providers.</p>
                <Button asChild variant="outline" size="sm" className="mt-3 h-7 text-[10px] uppercase font-bold">
                   <Link href="/dashboard/subscription">Upgrade Now</Link>
                </Button>
             </div>
           ) : (
             <div className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Public Provider Name</Label>
                  <Input 
                    placeholder="Enter your public name"
                    className="h-8 bg-white/[0.03] text-xs"
                    defaultValue={activeAccount?.copyProviderName || ""}
                    onBlur={(e) => activeAccount && providerMutation.mutate({ 
                      accountId: activeAccount._id, 
                      values: { copyProviderName: e.target.value } 
                    })}
                    disabled={!isProviding}
                  />
                </div>

                <div className="space-y-2 rounded-xl bg-white/[0.03] p-3">
                   <div className="flex items-center justify-between opacity-80">
                      <div className="flex items-center gap-2">
                        <Zap className="h-3 w-3 text-amber-400" />
                        <span className="text-[11px]">Copy Webhook Signals</span>
                      </div>
                      <Badge variant="success" className="text-[9px]">Always On</Badge>
                   </div>
                   <div className="flex items-center justify-between opacity-80">
                      <div className="flex items-center gap-2">
                        <MousePointer2 className="h-3 w-3 text-cyan-400" />
                        <span className="text-[11px]">Copy Manual Trades</span>
                      </div>
                      <Badge variant="success" className="text-[9px]">Always On</Badge>
                   </div>
                </div>

                {isProviding && (
                  <p className="text-[10px] text-emerald-400 font-medium">
                    ✓ Your trades are now public. Users can follow you using your email.
                  </p>
                )}
             </div>
           )}
        </div>

        {/* STEP 2: FOLLOW A TRADER */}
        <div className="flex flex-col rounded-[1.5rem] border border-white/[0.08] bg-white/[0.02] p-5">
           <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <UserPlus className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold">2. Follow a Trader</h3>
           </div>

           <div className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Trader's Email Address</Label>
                <Input 
                  placeholder="trader@example.com"
                  className="h-9 bg-white/[0.03] text-xs"
                  value={providerEmail}
                  onChange={(e) => setProviderEmail(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1 text-[10px] font-bold uppercase text-muted-foreground">
                    <TrendingDown className="h-3 w-3" /> Risk Per Trade ($)
                  </Label>
                  <Input 
                    type="number" 
                    step="5" 
                    min="1"
                    className="h-9 bg-white/[0.03] text-xs"
                    value={riskAmount}
                    onChange={(e) => setRiskAmount(Number(e.target.value))}
                  />
                </div>
                <Button 
                  className="mt-auto h-9 text-[10px] font-bold uppercase tracking-wide"
                  disabled={!providerEmail || !activeAccount || copyRequestMutation.isPending}
                  onClick={() => copyRequestMutation.mutate()}
                >
                  Request Access
                </Button>
              </div>

              {!activeAccount && (
                <p className="text-[10px] text-amber-400/80">Connect an MT5 account first to follow someone.</p>
              )}
           </div>
        </div>
      </div>

      {/* RELATIONSHIPS LIST */}
      {((copyStatus?.copying?.length ?? 0) > 0 || (copyStatus?.providing?.length ?? 0) > 0) && (
        <div className="space-y-3 pt-2">
           <div className="flex items-center gap-2 px-1">
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Active Connections</h3>
           </div>

           <div className="grid gap-3">
              {/* FOLLOWING */}
              {copyStatus?.copying.map((rel) => (
                <div key={rel._id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                   <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${rel.status === "active" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500"}`} />
                      <div>
                         <p className="text-xs font-bold">Following {rel.providerAccount?.copyProviderName || rel.provider?.email}</p>
                         <div className="flex items-center gap-2">
                            <p className="text-[9px] text-muted-foreground font-bold uppercase">
                              Status: {rel.status} · Risk: ${rel.riskAmountUsd || (rel.lotMultiplier * 10)} / trade
                            </p>
                            <Dialog open={editingRisk?.id === rel._id} onOpenChange={(open) => !open && setEditingRisk(null)}>
                               <DialogTrigger asChild>
                                  <button 
                                    className="p-1 hover:text-primary transition-colors"
                                    onClick={() => setEditingRisk({ id: rel._id, amount: rel.riskAmountUsd })}
                                  >
                                    <Edit2 className="h-2.5 w-2.5" />
                                  </button>
                               </DialogTrigger>
                               <DialogContent className="max-w-[300px]">
                                  <DialogHeader>
                                    <DialogTitle className="text-sm">Edit Risk Amount</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 pt-2">
                                     <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Risk Amount (USD)</Label>
                                        <Input 
                                          type="number" 
                                          className="h-8 text-xs" 
                                          value={editingRisk?.amount ?? 10} 
                                          onChange={(e) => setEditingRisk(prev => prev ? ({ ...prev, amount: Number(e.target.value) }) : null)}
                                        />
                                     </div>
                                     <Button 
                                       className="w-full h-8 text-[10px] font-bold uppercase"
                                       onClick={() => relationshipMutation.mutate({ id: rel._id, values: { riskAmountUsd: editingRisk?.amount } })}
                                     >
                                       Save Changes
                                     </Button>
                                  </div>
                               </DialogContent>
                            </Dialog>
                         </div>
                      </div>
                   </div>
                   <Button 
                     size="sm" 
                     variant="ghost" 
                     className="h-7 text-[9px] font-bold uppercase text-red-400 hover:bg-red-400/10"
                     onClick={() => relationshipMutation.mutate({ id: rel._id, action: "cancel" })}
                   >
                     {rel.status === "active" ? "Stop Following" : "Cancel"}
                   </Button>
                </div>
              ))}

              {/* FOLLOWERS */}
              {copyStatus?.providing.map((rel) => (
                <div key={rel._id} className="flex items-center justify-between rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] p-3">
                   <div className="flex items-center gap-3">
                      <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
                      <div>
                         <p className="text-xs font-bold">Follower: {rel.follower?.email}</p>
                         <p className="text-[9px] text-emerald-400/70 font-bold uppercase">
                           {rel.status === "active" ? "Connected" : "Pending Approval"} · Risk: ${rel.riskAmountUsd}
                         </p>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      {rel.status === "pending" ? (
                        <>
                          <Button size="sm" variant="secondary" className="h-7 text-[9px] font-bold uppercase" onClick={() => relationshipMutation.mutate({ id: rel._id, action: "reject" })}>Decline</Button>
                          <Button size="sm" className="h-7 text-[9px] font-bold uppercase" onClick={() => relationshipMutation.mutate({ id: rel._id, action: "accept" })}>Approve</Button>
                        </>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 text-[9px] font-bold uppercase text-red-400" onClick={() => relationshipMutation.mutate({ id: rel._id, action: "reject" })}>Remove</Button>
                      )}
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
}
