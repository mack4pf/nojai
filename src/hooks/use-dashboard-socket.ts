"use client";

import { useEffect, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";

import { SOCKET_PROXY_PATH, SERVER_API_BASE_URL } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { IQAccount } from "@/types";

let socket: Socket | null = null;

export function useDashboardSocket(enabled = true) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(socket?.connected ?? false);

  useEffect(() => {
    if (!enabled || !session?.accessToken) return;

    // Use absolute URL for the socket in production to bypass Next.js rewrite limitations for WebSockets
    const socketUrl = typeof window !== "undefined" && window.location.hostname !== "localhost"
      ? SERVER_API_BASE_URL.replace(/\/api$/, "")
      : undefined;

    socket = io(socketUrl, {
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

    socket.on("new-signal", (data: { ticker: string; signal: "buy" | "sell"; strategy: string }) => {
      toast(`New ${data.strategy.toUpperCase()} Signal`, {
        description: `${data.ticker} ${data.signal.toUpperCase()}`,
      });
    });

    socket.on("trade-placed", (data: { ticker: string; direction: string; amount: number; martingaleStep: number; account?: string }) => {
      toast.success("🚀 Trade Placed", {
        description: `${data.ticker} for $${data.amount} (Step ${data.martingaleStep})`,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.trades() });
    });

    socket.on("trade-completed", (data: { asset: string; result: "won" | "lost"; profit: number; balance: number; account?: string }) => {
      toast(data.result === "won" ? "🏁 Trade Finished: WIN" : "🏁 Trade Finished: LOSS", {
        description: `Asset: ${data.asset} | Profit: $${data.profit}`,
      });

      // Update the user's balance in the UI
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

      queryClient.invalidateQueries({ queryKey: queryKeys.trades() });
      queryClient.invalidateQueries({ queryKey: ["user-returns"] });
    });

    socket.on("trade-error", (data: { asset: string; error: string; account?: string }) => {
      toast.error(`❌ Trade Failed: ${data.asset}`, {
        description: data.error,
      });
    });

    socket.on("balance-update", (payload: { accountId: string; balance: number }) => {
      queryClient.setQueryData<IQAccount[]>(queryKeys.accounts, (current = []) =>
        current.map((account) =>
          account._id === payload.accountId
            ? { ...account, balance: payload.balance }
            : account,
        ),
      );
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