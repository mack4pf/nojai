"use client";

import { useEffect, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";

import { SOCKET_PROXY_PATH, BACKEND_ORIGIN } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useBrowserNotifications } from "@/hooks/use-browser-notifications";
import type { EOAccount, IQAccount, OlympAccount } from "@/types";

type BinaryBroker = "iq" | "eo" | "olymp";

let socket: Socket | null = null;

export function useDashboardSocket(enabled = true) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { notify } = useBrowserNotifications();
  // null = not yet established (connecting for the first time), true = connected, false = reconnecting
  const [isConnected, setIsConnected] = useState<boolean | null>(socket?.connected ?? null);

  useEffect(() => {
    if (!enabled || !session?.accessToken) return;

    // Always connect directly to the backend origin so WebSocket upgrades work in both dev and production.
    // BACKEND_ORIGIN is resolved from NEXT_PUBLIC_BACKEND_URL (available on client) so it's correct everywhere.
    socket = io(BACKEND_ORIGIN, {
      path: SOCKET_PROXY_PATH,
      auth: {
        token: session.accessToken,
      },
      transports: ["polling", "websocket"],
      reconnectionAttempts: 10,
    });

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("new-signal", (data: { ticker: string; signal: "buy" | "sell"; strategy: string; broker?: BinaryBroker }) => {
      const brokerLabel = data.broker ? ` on ${data.broker.toUpperCase()}` : "";
      toast(`New ${data.strategy?.toUpperCase() ?? "SIGNAL"} Signal`, {
        description: `${data.ticker} ${data.signal.toUpperCase()}${brokerLabel}`,
      });
    });

    socket.on("trade-placed", (data: { ticker: string; direction: string; amount: number; martingaleStep: number; account?: string; broker?: BinaryBroker; tokenId?: string }) => {
      const brokerLabel = data.broker ? ` [${data.broker.toUpperCase()}]` : "";
      toast.success(`🚀 Trade Placed${brokerLabel}`, {
        description: `${data.ticker} for $${data.amount} (Step ${data.martingaleStep})`,
      });
      notify("🚀 Trade Placed", {
        body: `${data.ticker} ${data.direction.toUpperCase()} — $${data.amount} (Step ${data.martingaleStep})`,
        tag: "trade-placed",
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.trades() });
    });

    socket.on("trade-completed", (data: { asset: string; result: string; profit: number; balance: number; account?: string; broker?: BinaryBroker; tokenId?: string; tradeId?: string }) => {
      const won = data.result === "won" || data.result === "win";
      const draw = data.result === "draw";
      const brokerLabel = data.broker ? ` [${data.broker.toUpperCase()}]` : "";
      toast(won ? `🏁 Trade Finished: WIN${brokerLabel}` : draw ? `🏁 Trade Finished: DRAW${brokerLabel}` : `🏁 Trade Finished: LOSS${brokerLabel}`, {
        description: `Asset: ${data.asset} | Profit: $${data.profit}`,
      });
      notify(won ? "✅ Trade Won" : draw ? "🤝 Trade Draw" : "❌ Trade Lost", {
        body: `${data.asset} — Profit: $${data.profit}`,
        tag: "trade-completed",
      });

      // Update IQ balance in bot status cache
      if (!data.broker || data.broker === "iq") {
        queryClient.setQueryData<{ iqAccounts: any[]; iqAccount: any }>(queryKeys.botStatus, (old) => {
          if (!old) return old;
          const currentAccounts = old.iqAccounts ?? (old.iqAccount ? [old.iqAccount] : []);
          if (!currentAccounts.length) return old;
          const updatedAccounts = currentAccounts.map((acc: { email: string }) => {
            const isMatch = data.account ? acc.email === data.account : true;
            return isMatch ? { ...acc, balance: data.balance } : acc;
          });
          return { ...old, iqAccounts: updatedAccounts, iqAccount: updatedAccounts[0] };
        });
      }

      // Update EO balance in eo-accounts cache
      if (data.broker === "eo" && data.tokenId) {
        const accountId = Number(data.tokenId);
        queryClient.setQueryData<EOAccount[]>(queryKeys.eoAccounts, (current = []) =>
          current.map((acc) =>
            acc.accountId === accountId ? { ...acc, balance: data.balance } : acc,
          ),
        );
      }

      if (data.broker === "olymp") {
        queryClient.invalidateQueries({ queryKey: queryKeys.olympAccounts });
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.trades() });
      queryClient.invalidateQueries({ queryKey: ["user-returns"] });
    });

    socket.on("trade-error", (data: { asset: string; error: string; account?: string; broker?: BinaryBroker; tradeId?: string }) => {
      toast.error(`❌ Trade Failed: ${data.asset}`, {
        description: data.error,
      });
      notify("⚠️ Trade Failed", {
        body: `${data.asset} — ${data.error}`,
        tag: "trade-error",
      });
    });

    socket.on("balance-update", (payload: { broker?: BinaryBroker; accountId?: string | number; accountEmail?: string; balance?: number; demoBalance?: number; realBalance?: number }) => {
      if (!payload.broker || payload.broker === "iq") {
        // IQ Option: update by accountId or email
        queryClient.setQueryData<IQAccount[]>(queryKeys.accounts, (current = []) =>
          current.map((account) => {
            const matchById = payload.accountId && account._id === String(payload.accountId);
            const matchByEmail = payload.accountEmail && account.email === payload.accountEmail;
            return (matchById || matchByEmail) && payload.balance != null
              ? { ...account, balance: payload.balance }
              : account;
          }),
        );
      }

      if (payload.broker === "eo" && payload.accountId != null) {
        const accountId = Number(payload.accountId);
        queryClient.setQueryData<EOAccount[]>(queryKeys.eoAccounts, (current = []) =>
          current.map((account) =>
            account.accountId === accountId
              ? {
                  ...account,
                  demoBalance: payload.demoBalance ?? account.demoBalance,
                  realBalance: payload.realBalance ?? account.realBalance,
                  balance: payload.balance ?? account.balance,
                }
              : account,
          ),
        );
      }

      if (payload.broker === "olymp" && payload.accountId != null) {
        const accountId = Number(payload.accountId);
        queryClient.setQueryData<OlympAccount[]>(queryKeys.olympAccounts, (current = []) =>
          current.map((account) =>
            account.accountId === accountId
              ? { ...account, balance: payload.balance ?? account.balance }
              : account,
          ),
        );
      }
    });

    socket.on("copy-trade-executed", (data: { broker: "eo"; sourceTokenId: string; asset: string; direction: "call" | "put"; amount: number }) => {
      toast(`📋 Copy Trade: ${data.asset}`, {
        description: `${data.direction.toUpperCase()} $${data.amount} (copied from #${data.sourceTokenId})`,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.trades() });
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [enabled, queryClient, session?.accessToken]);

  return {
    socket,
    isConnected,
  };
}
