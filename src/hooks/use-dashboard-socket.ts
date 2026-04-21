"use client";

import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";

import { SOCKET_PROXY_PATH } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { IQAccount, Trade } from "@/types";

let socket: Socket | null = null;

export function useDashboardSocket(enabled = true) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !session?.accessToken) return;

    socket = io({
      path: SOCKET_PROXY_PATH,
      auth: {
        token: session.accessToken,
      },
      transports: ["websocket"],
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

    socket.on("trade-result", (trade: Trade) => {
      toast(trade.result === "WIN" ? "Trade won" : "Trade settled", {
        description: `${trade.asset} ${trade.direction} ${trade.result}`,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.trades() });
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [enabled, queryClient, session?.accessToken]);
}