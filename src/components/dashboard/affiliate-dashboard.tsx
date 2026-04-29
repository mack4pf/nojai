"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, Copy, RefreshCw, CheckCircle2, ChevronDown, ChevronUp,
  Link2, Hash, Search, X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────
interface AffiliateDashboardData {
  balances: {
    USD: { available: number; pending: number; totalEarned: number; confirmed: number; paid: number; withdrawn: number };
    NGN: { available: number; pending: number; totalEarned: number; confirmed: number; paid: number; withdrawn: number };
  };
  recentRewards: any[];
  totalReferred: number;
  affiliateLink: string;
  referralCode?: string;
}

interface AffiliatePayout {
  _id: string;
  amount: number;
  currency: "USD" | "NGN";
  method: "bank" | "wallet";
  status: "pending" | "approved" | "paid" | "rejected";
  createdAt: string;
  adminNote?: string;
}

interface BankItem {
  name: string;
  code: string;
}

const CRYPTO_NETWORKS = [
  { label: "TRC20 (Tron)", value: "TRC20", currency: "usdttrc20" },
  { label: "ERC20 (Ethereum)", value: "ERC20", currency: "usdterc20" },
  { label: "BEP20 (BSC)", value: "BEP20", currency: "usdtbep20" },
] as const;

/** Extract the referral code from various formats the API might return */
function extractReferralCode(data?: AffiliateDashboardData): string {
  if (!data) return "";
  if (data.referralCode) return data.referralCode;
  const link = data.affiliateLink || "";
  const match = link.match(/[?&]ref=([^&]+)/);
  if (match) return decodeURIComponent(match[1]);
  if (link && !link.startsWith("http")) return link;
  return "";
}

// ─── Searchable Bank Dropdown ───────────────────────────────────
function BankSearchDropdown({
  banks,
  selectedCode,
  onSelect,
}: {
  banks: BankItem[];
  selectedCode: string;
  onSelect: (bank: BankItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selectedBank = banks.find((b) => b.code === selectedCode);
  const filtered = banks.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-foreground transition-colors hover:border-white/20 focus:border-primary focus:outline-none"
      >
        <span className={selectedBank ? "text-foreground" : "text-muted-foreground"}>
          {selectedBank ? selectedBank.name : "Select a bank..."}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full rounded-xl border border-white/10 bg-[#1a1a2e] shadow-2xl overflow-hidden animate-fade-up">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search banks..."
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">No banks found</p>
            ) : (
              filtered.map((bank) => (
                <button
                  key={bank.code}
                  type="button"
                  onClick={() => { onSelect(bank); setOpen(false); setSearch(""); }}
                  className={`flex w-full items-center px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/[0.06] ${bank.code === selectedCode ? "bg-primary/10 text-primary font-medium" : "text-foreground"
                    }`}
                >
                  {bank.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────
export function AffiliateDashboard() {
  const queryClient = useQueryClient();
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<"bank" | "wallet">("wallet");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Payout Form State
  const [amount, setAmount] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [selectedBankCode, setSelectedBankCode] = useState("");
  const [selectedBankName, setSelectedBankName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletNetwork, setWalletNetwork] = useState("TRC20");
  const [note, setNote] = useState("");

  // Fetch banks for NGN payouts
  const { data: banksList = [] } = useQuery<BankItem[]>({
    queryKey: ["affiliate-banks"],
    queryFn: async () => {
      const res = await api.get("/affiliate/banks");
      return res.data;
    },
    enabled: payoutMethod === "bank",
  });

  const { data: dashboardData, isLoading: isLoadingDashboard, refetch: refetchDashboard } = useQuery<AffiliateDashboardData>({
    queryKey: ["affiliate-dashboard"],
    queryFn: async () => {
      const res = await api.get("/affiliate/dashboard");
      return res.data;
    },
  });

  const { data: payoutsData = [], isLoading: isLoadingPayouts, refetch: refetchPayouts } = useQuery<AffiliatePayout[]>({
    queryKey: ["affiliate-payouts"],
    queryFn: async () => {
      const res = await api.get("/affiliate/payouts");
      return res.data;
    },
  });

  const requestPayout = useMutation({
    mutationFn: async () => {
      const cryptoNet = CRYPTO_NETWORKS.find(n => n.value === walletNetwork);
      const payload = {
        amount: Number(amount),
        currency: payoutMethod === "bank" ? "NGN" : "USD",
        method: payoutMethod,
        bankDetails: payoutMethod === "bank" ? {
          accountName: bankAccountName,
          accountNumber: bankAccountNumber,
          bankName: selectedBankName,
          bankCode: selectedBankCode,
        } : undefined,
        walletDetails: payoutMethod === "wallet" ? {
          address: walletAddress,
          network: walletNetwork,
          currency: cryptoNet?.currency || "usdttrc20",
        } : undefined,
        note,
      };
      const res = await api.post("/affiliate/payouts", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Payout request submitted successfully!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["affiliate-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["affiliate-payouts"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || "Failed to submit payout request");
    },
  });

  function resetForm() {
    setShowPayoutForm(false);
    setAmount("");
    setNote("");
    setBankAccountNumber("");
    setBankAccountName("");
    setSelectedBankCode("");
    setSelectedBankName("");
    setWalletAddress("");
  }

  // Build referral link from browser URL
  const referralCode = extractReferralCode(dashboardData);
  const referralLink = useMemo(() => {
    if (!referralCode) return "";
    if (typeof window !== "undefined") {
      return `${window.location.origin}/auth/register?ref=${referralCode}`;
    }
    return `/auth/register?ref=${referralCode}`;
  }, [referralCode]);

  const handleCopyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    toast.success("Referral code copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (payoutMethod === "wallet" && Number(amount) < 5) {
      toast.error("Minimum payout for Crypto is $5.");
      return;
    }
    if (payoutMethod === "bank" && !selectedBankCode) {
      toast.error("Please select a bank.");
      return;
    }
    requestPayout.mutate();
  };

  if (isLoadingDashboard) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const usdBalance = dashboardData?.balances?.USD;
  const ngnBalance = dashboardData?.balances?.NGN;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Affiliate Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Earn up to $500 monthly by sharing NOJAI with your friends.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { refetchDashboard(); refetchPayouts(); }} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button onClick={() => setShowPayoutForm(!showPayoutForm)} className="gap-2">
            Request Payout {showPayoutForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Referral Link & Code Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-r from-primary/10 to-transparent p-6 space-y-4">
        <div>
          <h3 className="text-lg font-medium text-primary">Your Referral Link</h3>
          <p className="text-sm text-muted-foreground">
            Share this link to earn ₦9,000 – ₦20,000 or $6 – $14 per referral.
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Link2 className="h-3 w-3" /> Referral Link
          </label>
          <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1.5 border border-white/10 overflow-hidden">
            <code className="flex-1 text-sm px-3 text-white/90 truncate select-all">
              {referralLink || "Generating your link..."}
            </code>
            <Button size="sm" onClick={handleCopyLink} disabled={!referralLink} className="shrink-0 gap-1.5 min-w-[90px]">
              {copiedLink ? <><CheckCircle2 className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy Link</>}
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Hash className="h-3 w-3" /> Referral Code
          </label>
          <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1.5 border border-white/10 overflow-hidden">
            <code className="flex-1 text-sm px-3 font-mono font-bold tracking-widest text-primary select-all">
              {referralCode || "—"}
            </code>
            <Button size="sm" variant="outline" onClick={handleCopyCode} disabled={!referralCode} className="shrink-0 gap-1.5 min-w-[90px]">
              {copiedCode ? <><CheckCircle2 className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy Code</>}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <p className="text-sm font-medium text-muted-foreground">Available USD</p>
          <p className="mt-2 font-display text-3xl font-semibold text-foreground">
            {formatCurrency(usdBalance?.available || 0, "USD")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Pending: {formatCurrency(usdBalance?.pending || 0, "USD")}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <p className="text-sm font-medium text-muted-foreground">Available NGN</p>
          <p className="mt-2 font-display text-3xl font-semibold text-foreground">
            {formatCurrency(ngnBalance?.available || 0, "NGN")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Pending: {formatCurrency(ngnBalance?.pending || 0, "NGN")}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <p className="text-sm font-medium text-muted-foreground">Total Referrals</p>
          <p className="mt-2 font-display text-3xl font-semibold text-foreground">
            {dashboardData?.totalReferred || 0}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Active referrals</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-emerald-500/10 to-transparent p-5">
          <p className="text-sm font-medium text-emerald-400">Total Earned</p>
          <p className="mt-2 font-display text-2xl font-semibold text-foreground">
            {formatCurrency(usdBalance?.totalEarned || 0, "USD")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCurrency(ngnBalance?.totalEarned || 0, "NGN")} in Naira
          </p>
        </div>
      </div>

      {/* Payout Request Form */}
      {showPayoutForm && (
        <div className="animate-fade-up rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-4">
          <div>
            <h3 className="text-lg font-medium text-foreground">Request Payout</h3>
            <p className="text-sm text-muted-foreground">Withdraw your available balance. Minimum $5 for Crypto.</p>
          </div>

          <form onSubmit={handlePayoutSubmit} className="space-y-4">
            <div className="flex gap-3">
              <Button type="button" variant={payoutMethod === "wallet" ? "default" : "outline"} onClick={() => setPayoutMethod("wallet")}>
                Crypto Wallet (USD)
              </Button>
              <Button type="button" variant={payoutMethod === "bank" ? "default" : "outline"} onClick={() => setPayoutMethod("bank")}>
                Bank Transfer (NGN)
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Amount ({payoutMethod === "wallet" ? "USD" : "NGN"})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={payoutMethod === "wallet" ? 5 : 1000}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={payoutMethod === "wallet" ? "Min $5" : "Min ₦1000"}
                />
              </div>

              {payoutMethod === "wallet" ? (
                <>
                  <div className="space-y-1.5">
                    <Label>Wallet Address (USDT)</Label>
                    <Input required value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} placeholder="TXyz123... or 0x..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Network</Label>
                    <div className="flex gap-2">
                      {CRYPTO_NETWORKS.map((net) => (
                        <button
                          key={net.value}
                          type="button"
                          onClick={() => setWalletNetwork(net.value)}
                          className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${walletNetwork === net.value
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-foreground"
                            }`}
                        >
                          {net.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>Bank</Label>
                    <BankSearchDropdown
                      banks={banksList}
                      selectedCode={selectedBankCode}
                      onSelect={(bank) => {
                        setSelectedBankCode(bank.code);
                        setSelectedBankName(bank.name);
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Account Number</Label>
                    <Input required value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} placeholder="10 digits" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Account Name</Label>
                    <Input required value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} placeholder="Full name on account" />
                  </div>
                </>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Optional Note</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any special instructions..." />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={requestPayout.isPending} className="min-w-[150px]">
                {requestPayout.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Submit Request"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Grid for Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Rewards */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground">Recent Rewards</h3>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
            {(!dashboardData?.recentRewards || dashboardData.recentRewards.length === 0) ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No rewards yet. Share your link to start earning!</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.03]">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Plan</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {dashboardData.recentRewards.map((reward: any) => (
                    <tr key={reward.id || reward._id} className="bg-white/[0.01]">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(reward.createdAt)}</td>
                      <td className="px-4 py-3 text-foreground capitalize">{reward.plan}</td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-400">
                        +{formatCurrency(reward.amount, reward.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Payout History */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground">Payout History</h3>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
            {isLoadingPayouts ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : payoutsData.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No payouts requested yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.03]">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {payoutsData.map((payout) => (
                    <tr key={payout._id} className="bg-white/[0.01]">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(payout.createdAt)}</td>
                      <td className="px-4 py-3 text-foreground font-medium">
                        {formatCurrency(payout.amount, payout.currency)} <span className="text-xs text-muted-foreground uppercase">({payout.method})</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold ${payout.status === 'approved' ? 'bg-blue-500/15 text-blue-300' :
                            payout.status === 'paid' ? 'bg-emerald-500/15 text-emerald-300' :
                              payout.status === 'rejected' ? 'bg-red-500/15 text-red-300' :
                                'bg-amber-500/15 text-amber-300'
                          }`}>
                          {payout.status === 'pending' ? 'Awaiting Approval' :
                            payout.status === 'approved' ? 'Processing' :
                              payout.status === 'paid' ? 'Paid ✓' :
                                'Rejected'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
