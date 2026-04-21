"use client";

import { useEffect, useRef, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Bug, ChevronDown, Loader2, MessageCircle, Send, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface SupportMessage {
  _id: string;
  message: string;
  isFromAdmin: boolean;
  read: boolean;
  createdAt: string;
}

type MessageType = "general" | "bug" | "issue";

const TYPE_OPTIONS: Array<{ value: MessageType; label: string; icon: React.ReactNode }> = [
  { value: "general", label: "General", icon: <MessageCircle className="h-3.5 w-3.5" /> },
  { value: "issue", label: "Issue", icon: <AlertCircle className="h-3.5 w-3.5" /> },
  { value: "bug", label: "Bug report", icon: <Bug className="h-3.5 w-3.5" /> },
];

// Bottom offset: on mobile sits above the 76px bottom nav + 16px gap = 92px
// On sm+ there's no bottom nav so just 24px
const BOTTOM_MOBILE = "bottom-[92px]";
const BOTTOM_DESKTOP = "sm:bottom-6";

export function SupportChat() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false); // drives animation
  const [message, setMessage] = useState("");
  const [type, setType] = useState<MessageType>("general");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync panelVisible with open, one frame later so CSS transition fires
  useEffect(() => {
    if (open) {
      // Mount first, then set visible so transition plays
      requestAnimationFrame(() => setPanelVisible(true));
    } else {
      setPanelVisible(false);
    }
  }, [open]);

  const { data: messages = [], isLoading } = useQuery<SupportMessage[]>({
    queryKey: ["support-history"],
    queryFn: async () => {
      const res = await api.get("/support/history");
      return Array.isArray(res.data) ? res.data : [];
    },
    refetchInterval: open ? 20000 : false,
    refetchIntervalInBackground: false,
    enabled: open,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const prefix = type !== "general" ? `[${type.toUpperCase()}] ` : "";
      await api.post("/support/message", {
        message: `${prefix}${message.trim()}`,
        type,
      });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["support-history"] });
      toast.success("Message sent. A confirmation has been sent to your email.");
    },
    onError: () => toast.error("Failed to send message. Please try again."),
  });

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const unreadFromAdmin = messages.filter((m) => m.isFromAdmin && !m.read).length;

  if (hidden) {
    // Tiny peek tab so user can restore
    return (
      <button
        onClick={() => setHidden(false)}
        className={`fixed right-4 ${BOTTOM_MOBILE} ${BOTTOM_DESKTOP} z-50 flex items-center gap-1.5 rounded-full border border-white/10 bg-background/90 px-3 py-2 text-xs font-medium text-muted-foreground shadow-lg backdrop-blur-sm transition-all hover:text-foreground`}
        aria-label="Show support chat"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Support
      </button>
    );
  }

  return (
    <>
      {/* Chat panel — mounts when open, animates in/out via opacity + translate */}
      {open && (
        <div
          className={`fixed right-4 z-50 w-[calc(100vw-2rem)] max-w-sm ${BOTTOM_MOBILE} sm:right-6 ${BOTTOM_DESKTOP} sm:max-w-[360px] transition-all duration-300 ease-out ${
            panelVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0 pointer-events-none"
          }`}
          style={{ bottom: undefined }} // let tailwind classes control
        >
          <div
            className="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-background shadow-2xl shadow-black/60"
            style={{
              // push panel above the toggle button (button is h-12 = 48px + 8px gap)
              marginBottom: "64px",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.04] px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary">
                  <MessageCircle className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Support</p>
                  <p className="text-[11px] text-muted-foreground">Replies also sent to your email</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Hide widget */}
                <button
                  onClick={() => { setOpen(false); setHidden(true); }}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
                  title="Hide support chat"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                {/* Close panel */}
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex h-64 flex-col gap-2 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <MessageCircle className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">
                    No messages yet. Send a message to get help from our team.
                  </p>
                  <p className="text-[11px] text-muted-foreground/50">
                    Support replies will also be sent to your email.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg._id} className={`flex ${msg.isFromAdmin ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        msg.isFromAdmin
                          ? "rounded-tl-sm bg-white/[0.08] text-foreground"
                          : "rounded-tr-sm bg-primary text-primary-foreground"
                      }`}
                    >
                      <p className="leading-relaxed">{msg.message}</p>
                      <p className={`mt-1 text-[10px] ${msg.isFromAdmin ? "text-muted-foreground" : "text-primary-foreground/60"}`}>
                        {msg.isFromAdmin ? "Support team" : "You"} · {formatDate(msg.createdAt, "HH:mm")}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Type selector */}
            <div className="flex gap-1 border-t border-white/[0.06] px-4 pt-3">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                    type === opt.value
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="flex gap-2 p-3 pt-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  type === "bug"
                    ? "Describe the bug you found..."
                    : type === "issue"
                      ? "Describe the issue you're experiencing..."
                      : "Type your message..."
                }
                rows={2}
                className="resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && message.trim().length >= 3) {
                    e.preventDefault();
                    sendMutation.mutate();
                  }
                }}
              />
              <Button
                size="sm"
                onClick={() => sendMutation.mutate()}
                disabled={message.trim().length < 3 || sendMutation.isPending}
                className="h-auto self-end px-3"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating toggle button — bottom RIGHT, above mobile nav */}
      <div className={`fixed right-4 ${BOTTOM_MOBILE} ${BOTTOM_DESKTOP} z-50 sm:right-6`}>
        <button
          onClick={() => setOpen((prev) => !prev)}
          className={`group relative flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30 transition-all duration-200 hover:scale-110 hover:shadow-xl hover:shadow-primary/40 active:scale-95 ${
            open ? "rotate-0" : ""
          }`}
          aria-label={open ? "Close support chat" : "Open support chat"}
        >
          <span className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${open ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50"}`}>
            <X className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${open ? "opacity-0 -rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"}`}>
            <MessageCircle className="h-5 w-5 text-primary-foreground" />
          </span>
          {!open && unreadFromAdmin > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-background">
              {unreadFromAdmin > 9 ? "9+" : unreadFromAdmin}
            </span>
          )}
        </button>
      </div>
    </>
  );
}
