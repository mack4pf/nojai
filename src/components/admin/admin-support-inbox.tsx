"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2, MessageCircle, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface Conversation {
  _id: string; // userId
  lastMessage: string;
  lastAt: string;
  unreadCount: number;
  user?: { _id: string; email: string; fullName?: string };
}

interface SupportMessage {
  _id: string;
  message: string;
  isFromAdmin: boolean;
  read: boolean;
  createdAt: string;
}

export function AdminSupportInbox() {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");

  const { data: conversations = [], isLoading: loadingConvos, refetch, isFetching } = useQuery<Conversation[]>({
    queryKey: ["admin-support-conversations"],
    queryFn: async () => {
      const res = await api.get("/support/conversations");
      return Array.isArray(res.data) ? res.data : [];
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery<SupportMessage[]>({
    queryKey: ["admin-support-messages", selectedUserId],
    queryFn: async () => {
      const res = await api.get(`/support/history/${selectedUserId}`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!selectedUserId,
    refetchInterval: selectedUserId ? 20000 : false,
    refetchIntervalInBackground: false,
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/support/reply/${selectedUserId}`, { message: reply.trim() });
    },
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["admin-support-messages", selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["admin-support-conversations"] });
    },
    onError: () => toast.error("Failed to send reply."),
  });

  const filteredConvos = search.trim()
    ? conversations.filter(
        (c) =>
          c.user?.email.toLowerCase().includes(search.toLowerCase()) ||
          c.user?.fullName?.toLowerCase().includes(search.toLowerCase()),
      )
    : conversations;

  const selectedConvo = conversations.find((c) => c._id === selectedUserId);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="grid h-[calc(100vh-8rem)] gap-4 lg:grid-cols-[300px_1fr]">
      {/* Sidebar — conversations */}
      <div className="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/[0.06] p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Conversations</p>
              {totalUnread > 0 ? (
                <p className="text-xs text-amber-400">{totalUnread} unread</p>
              ) : (
                <p className="text-xs text-muted-foreground">All caught up</p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <div className="mt-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvos ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConvos.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No conversations yet.
            </div>
          ) : (
            filteredConvos.map((convo) => (
              <button
                key={convo._id}
                onClick={() => setSelectedUserId(convo._id)}
                className={`w-full border-b border-white/[0.04] px-4 py-3 text-left transition-colors hover:bg-white/[0.04] ${
                  selectedUserId === convo._id ? "bg-white/[0.06]" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {convo.user?.fullName ?? convo.user?.email ?? "Unknown user"}
                    </p>
                    {convo.user?.fullName ? (
                      <p className="truncate text-[11px] text-muted-foreground">{convo.user.email}</p>
                    ) : null}
                  </div>
                  {convo.unreadCount > 0 ? (
                    <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                      {convo.unreadCount}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">{convo.lastMessage}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                  {formatDate(convo.lastAt, "MMM d · HH:mm")}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main — chat thread */}
      <div className="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        {!selectedUserId ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">Select a conversation to view messages and reply.</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="border-b border-white/[0.06] px-5 py-4">
              <p className="font-semibold text-foreground">
                {selectedConvo?.user?.fullName ?? selectedConvo?.user?.email ?? "User"}
              </p>
              {selectedConvo?.user?.fullName ? (
                <p className="text-xs text-muted-foreground">{selectedConvo.user.email}</p>
              ) : null}
            </div>

            {/* Messages */}
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
              {loadingMessages ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">No messages in this conversation.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg._id} className={`flex ${msg.isFromAdmin ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
                        msg.isFromAdmin
                          ? "rounded-tr-sm bg-primary text-primary-foreground"
                          : "rounded-tl-sm bg-white/[0.08] text-foreground"
                      }`}
                    >
                      <p className="leading-relaxed">{msg.message}</p>
                      <p
                        className={`mt-1 text-[10px] ${
                          msg.isFromAdmin ? "text-primary-foreground/60" : "text-muted-foreground"
                        }`}
                      >
                        {msg.isFromAdmin ? "You (admin)" : "User"} · {formatDate(msg.createdAt, "MMM d · HH:mm")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reply box */}
            <div className="flex gap-3 border-t border-white/[0.06] p-4">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply..."
                rows={2}
                className="resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && reply.trim().length >= 1) {
                    e.preventDefault();
                    replyMutation.mutate();
                  }
                }}
              />
              <Button
                onClick={() => replyMutation.mutate()}
                disabled={reply.trim().length < 1 || replyMutation.isPending}
                className="h-auto self-end"
              >
                {replyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
