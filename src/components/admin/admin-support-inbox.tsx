"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, Download, Loader2, MessageCircle, Paperclip, Pencil, RefreshCw, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm", "video/quicktime"];

interface Attachment {
  url: string;
  type: "image" | "video";
  originalName: string;
  mimeType: string;
}

interface Conversation {
  _id: string;
  lastMessage: string;
  lastAt: string;
  unreadCount: number;
  user?: { _id: string; email: string; fullName?: string };
}

// A stable reference for react-query's "no data yet" default — a fresh `[]`
// literal on every render was the root cause of the ordering effect below
// looping forever (its dependency array saw a "new" array every render).
const EMPTY_CONVERSATIONS: Conversation[] = [];

interface SupportMessage {
  _id: string;
  message: string;
  isFromAdmin: boolean;
  read: boolean;
  attachments: Attachment[];
  createdAt: string;
  deleted?: boolean;
  editedAt?: string;
}

function AttachmentPreview({ att, onRemove }: { att: File; onRemove: () => void }) {
  const url = URL.createObjectURL(att);
  const isVideo = att.type.startsWith("video/");
  return (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10">
      {isVideo ? (
        <video src={url} className="h-full w-full object-cover" muted />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={att.name} className="h-full w-full object-cover" />
      )}
      <button
        onClick={onRemove}
        className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

function MediaViewer({ att, onClose }: { att: Attachment; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-full max-w-full flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="mb-3 flex w-full items-center justify-between gap-4 px-1">
          <span className="truncate text-sm text-white/70">{att.originalName}</span>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={att.url}
              download={att.originalName}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </a>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {att.type === "video" ? (
          <video
            src={att.url}
            controls
            autoPlay
            className="max-h-[80vh] max-w-[90vw] rounded-2xl"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={att.url}
            alt={att.originalName}
            className="max-h-[80vh] max-w-[90vw] rounded-2xl object-contain"
          />
        )}
      </div>
    </div>
  );
}

function MessageAttachment({ att, onOpen }: { att: Attachment; onOpen: (att: Attachment) => void }) {
  if (att.type === "video") {
    return (
      <button onClick={() => onOpen(att)} className="mt-2 block w-full max-w-[260px] overflow-hidden rounded-xl">
        <div className="relative">
          <video
            src={att.url}
            className="h-36 w-full object-cover"
            preload="metadata"
            muted
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <svg className="h-5 w-5 translate-x-0.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>
      </button>
    );
  }
  return (
    <button onClick={() => onOpen(att)} className="mt-2 block w-full max-w-[260px] overflow-hidden rounded-xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={att.url}
        alt={att.originalName}
        className="max-h-48 w-full object-cover transition-opacity hover:opacity-90"
        loading="lazy"
      />
    </button>
  );
}

export function AdminSupportInbox() {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [viewingAtt, setViewingAtt] = useState<Attachment | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = EMPTY_CONVERSATIONS, isLoading: loadingConvos, refetch, isFetching } = useQuery<Conversation[]>({
    queryKey: ["admin-support-conversations"],
    queryFn: async () => {
      const res = await api.get("/support/conversations");
      return Array.isArray(res.data) ? res.data : [];
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  // The backend sorts conversations by most-recent-activity, so a background
  // refetch can silently jump a conversation to the top while an admin is
  // mid-click — landing the reply on the wrong person. Keep already-seen
  // conversations pinned to their position; only genuinely new ones get
  // inserted (at the top), so the row under the cursor never shifts.
  // A ref (not state) tracks the order so recomputing it can never trigger
  // another render, which is what caused the infinite update loop before.
  const orderRef = useRef<string[]>([]);
  const stableConversations = useMemo(() => {
    const currentIds = new Set(conversations.map((c) => c._id));
    const kept = orderRef.current.filter((id) => currentIds.has(id));
    const known = new Set(kept);
    const fresh = conversations.map((c) => c._id).filter((id) => !known.has(id));
    orderRef.current = [...fresh, ...kept];
    return orderRef.current
      .map((id) => conversations.find((c) => c._id === id))
      .filter((c): c is Conversation => Boolean(c));
  }, [conversations]);

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

  // Mark user messages as read when a conversation is selected
  const adminReadMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/support/admin-read/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-conversations"] });
    },
  });

  function selectConversation(userId: string) {
    setSelectedUserId(userId);
    adminReadMutation.mutate(userId);
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const replyMutation = useMutation({
    mutationFn: async () => {
      const text = reply.trim();
      if (selectedFiles.length > 0) {
        const form = new FormData();
        if (text) form.append("message", text);
        selectedFiles.forEach((f) => form.append("files", f));
        // false removes the header entirely so the browser sets multipart/form-data + boundary
        await api.post(`/support/reply/${selectedUserId}`, form, { headers: { "Content-Type": false as any } });
      } else {
        await api.post(`/support/reply/${selectedUserId}`, { message: text });
      }
    },
    onSuccess: () => {
      setReply("");
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["admin-support-messages", selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["admin-support-conversations"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to send reply."),
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => api.delete(`/support/message/${messageId}`),
    onSuccess: () => {
      toast.success("Message deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-support-messages", selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["admin-support-conversations"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to delete message"),
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (userId: string) => api.delete(`/support/conversation/${userId}`),
    onSuccess: () => {
      toast.success("Conversation deleted");
      setSelectedUserId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-support-conversations"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to delete conversation"),
  });

  function deleteConversation() {
    if (!selectedUserId) return;
    const name = selectedConvo?.user?.fullName ?? selectedConvo?.user?.email ?? "this user";
    if (!window.confirm(`Delete the entire conversation with ${name}? This permanently removes every message and cannot be undone.`)) return;
    deleteConversationMutation.mutate(selectedUserId);
  }

  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, message }: { messageId: string; message: string }) =>
      api.patch(`/support/message/${messageId}`, { message }),
    onSuccess: () => {
      toast.success("Message updated");
      setEditingMessageId(null);
      setEditText("");
      queryClient.invalidateQueries({ queryKey: ["admin-support-messages", selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["admin-support-conversations"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to update message"),
  });

  function startEdit(msg: SupportMessage) {
    setEditingMessageId(msg._id);
    setEditText(msg.message);
  }

  function cancelEdit() {
    setEditingMessageId(null);
    setEditText("");
  }

  function saveEdit(messageId: string) {
    const text = editText.trim();
    if (!text) return;
    editMessageMutation.mutate({ messageId, message: text });
  }

  function deleteMessage(messageId: string) {
    if (!window.confirm("Delete this message? This cannot be undone.")) return;
    deleteMessageMutation.mutate(messageId);
  }

  const filteredConvos = search.trim()
    ? stableConversations.filter(
        (c) =>
          c.user?.email.toLowerCase().includes(search.toLowerCase()) ||
          c.user?.fullName?.toLowerCase().includes(search.toLowerCase()),
      )
    : stableConversations;

  const selectedConvo = conversations.find((c) => c._id === selectedUserId);
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const canReply = (reply.trim().length >= 1 || selectedFiles.length > 0) && !replyMutation.isPending;

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const valid = Array.from(files).filter((f) => {
      if (!ALLOWED_TYPES.includes(f.type)) {
        toast.error(`${f.name}: unsupported file type`);
        return false;
      }
      if (f.size > 50 * 1024 * 1024) {
        toast.error(`${f.name}: file exceeds 50 MB limit`);
        return false;
      }
      return true;
    });
    setSelectedFiles((prev) => [...prev, ...valid].slice(0, 5));
  }

  return (
    <>
    {viewingAtt && <MediaViewer att={viewingAtt} onClose={() => setViewingAtt(null)} />}
    <div className="grid h-[calc(100vh-8rem)] gap-4 lg:grid-cols-[300px_1fr]">
      {/* Sidebar */}
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
            <div className="p-6 text-center text-sm text-muted-foreground">No conversations yet.</div>
          ) : (
            filteredConvos.map((convo) => (
              <button
                key={convo._id}
                onClick={() => selectConversation(convo._id)}
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

      {/* Chat thread */}
      <div className="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        {!selectedUserId ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">Select a conversation to view messages and reply.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
              <div>
                <p className="font-semibold text-foreground">
                  {selectedConvo?.user?.fullName ?? selectedConvo?.user?.email ?? "User"}
                </p>
                {selectedConvo?.user?.fullName ? (
                  <p className="text-xs text-muted-foreground">{selectedConvo.user.email}</p>
                ) : null}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={deleteConversation}
                disabled={deleteConversationMutation.isPending}
                className="h-8 gap-1.5 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete conversation
              </Button>
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
                messages.map((msg) => {
                  const isEditing = editingMessageId === msg._id;
                  return (
                  <div key={msg._id} className={`group flex items-end gap-1.5 ${msg.isFromAdmin ? "justify-end" : "justify-start"}`}>
                    {!msg.deleted && (
                      <div className={`flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 ${msg.isFromAdmin ? "order-first" : "order-last"}`}>
                        {msg.isFromAdmin && !isEditing && (
                          <button
                            type="button"
                            aria-label="Edit message"
                            onClick={() => startEdit(msg)}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label="Delete message"
                          onClick={() => deleteMessage(msg._id)}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
                        msg.deleted
                          ? "border border-dashed border-white/10 bg-transparent italic text-muted-foreground"
                          : msg.isFromAdmin
                          ? "rounded-tr-sm bg-primary text-primary-foreground"
                          : "rounded-tl-sm bg-white/[0.08] text-foreground"
                      }`}
                    >
                      {msg.deleted ? (
                        <p className="leading-relaxed">This message was deleted.</p>
                      ) : isEditing ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={2}
                            className="resize-none border-white/20 bg-black/20 text-sm text-foreground"
                          />
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="flex h-6 w-6 items-center justify-center rounded-md text-primary-foreground/70 hover:text-primary-foreground"
                              aria-label="Cancel edit"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => saveEdit(msg._id)}
                              disabled={editMessageMutation.isPending || !editText.trim()}
                              className="flex h-6 w-6 items-center justify-center rounded-md text-primary-foreground/70 hover:text-primary-foreground disabled:opacity-50"
                              aria-label="Save edit"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {msg.message && !/^\[(image|video|\d+ attachments?)\]$/.test(msg.message) && (
                            <p className="leading-relaxed">{msg.message}</p>
                          )}
                          {msg.attachments?.map((att, i) => (
                            <MessageAttachment key={i} att={att} onOpen={setViewingAtt} />
                          ))}
                        </>
                      )}
                      <div
                        className={`mt-1 flex items-center gap-1 text-[10px] ${
                          msg.isFromAdmin ? "text-primary-foreground/60" : "text-muted-foreground"
                        }`}
                      >
                        <span>
                          {msg.isFromAdmin ? "You (admin)" : "User"} · {formatDate(msg.createdAt, "MMM d · HH:mm")}
                        </span>
                        {!msg.deleted && msg.editedAt && <span className="italic">· edited</span>}
                        {msg.isFromAdmin && msg.read && (
                          <span className="ml-0.5 font-medium">· Seen</span>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* File previews */}
            {selectedFiles.length > 0 && (
              <div className="flex gap-2 overflow-x-auto border-t border-white/[0.06] px-4 py-2">
                {selectedFiles.map((f, i) => (
                  <AttachmentPreview
                    key={i}
                    att={f}
                    onRemove={() => setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  />
                ))}
              </div>
            )}

            {/* Reply box */}
            <div className="border-t border-white/[0.06] px-4 pt-2">
              <p className="text-[11px] text-muted-foreground">
                Replying to{" "}
                <span className="font-semibold text-foreground">
                  {selectedConvo?.user?.fullName ?? selectedConvo?.user?.email ?? "this user"}
                </span>
                {selectedConvo?.user?.fullName ? ` (${selectedConvo.user.email})` : ""}
              </p>
            </div>
            <div className="flex items-end gap-3 p-4 pt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
                title="Attach image or video"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply..."
                rows={2}
                className="resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && canReply) {
                    e.preventDefault();
                    replyMutation.mutate();
                  }
                }}
              />
              <Button
                onClick={() => replyMutation.mutate()}
                disabled={!canReply}
                className="mb-1 h-9 w-9 shrink-0 p-0"
              >
                {replyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}
