"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, EyeOff, Loader2, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmailNotice } from "@/components/ui/email-notice";
import { formatDate } from "@/lib/utils";

interface UserSettings {
  email: string;
  fullName: string;
  role: string;
  telegramId?: string;
  createdAt: string;
  lastLogin?: string;
  // When the backend adds this field it will be picked up automatically
  emailVerifiedAt?: string | null;
}

export function ProfileSettingsForm() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<UserSettings>({
    queryKey: ["user-settings-profile"],
    queryFn: async () => (await api.get("/user/settings")).data,
  });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [emailChanged, setEmailChanged] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (data) {
      setFullName(data.fullName ?? "");
      setEmail(data.email ?? "");
    }
  }, [data]);

  const profileMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put("/user/settings", {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings-profile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setProfileError("");
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 5000);
      toast.success("Profile updated");
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message ?? "Failed to update profile";
      setProfileError(msg);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put("/user/settings", {
        currentPassword,
        newPassword,
      });
      return res.data;
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 8000);
      toast.success("Password changed");
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message ?? "Failed to change password";
      setPasswordError(msg);
    },
  });

  function handlePasswordSubmit() {
    setPasswordError("");
    if (!currentPassword || !newPassword) {
      setPasswordError("Both fields are required.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    passwordMutation.mutate();
  }

  const isEmailVerified = data?.emailVerifiedAt != null;
  const hasEmailVerifiedField = data !== undefined && "emailVerifiedAt" in data;

  return (
    <div className="space-y-6">
      {/* ── Account meta ── */}
      {data && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">Role</p>
            <p className="mt-1 font-semibold capitalize text-foreground">{data.role}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">Member Since</p>
            <p className="mt-1 font-semibold text-foreground">{data.createdAt ? formatDate(data.createdAt) : "—"}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">Last Login</p>
            <p className="mt-1 font-semibold text-foreground">{data.lastLogin ? formatDate(data.lastLogin) : "—"}</p>
          </div>
        </div>
      )}

      {/* ── Email verification status ── */}
      {data && hasEmailVerifiedField && (
        <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-xs ${
          isEmailVerified
            ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300"
            : "border-amber-500/20 bg-amber-500/[0.06] text-amber-300"
        }`}>
          {isEmailVerified ? (
            <ShieldCheck className="h-4 w-4 shrink-0" />
          ) : (
            <Mail className="h-4 w-4 shrink-0" />
          )}
          <div className="flex-1">
            {isEmailVerified ? (
              <span>
                Email verified on{" "}
                <strong>{formatDate(data.emailVerifiedAt!)}</strong>.
              </span>
            ) : (
              <span>
                Email not yet verified.{" "}
                <span className="text-amber-200/70">Check your inbox for a verification link or contact support.</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Profile form ── */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold">Profile Information</h3>
          {profileSaved && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setProfileSaved(false); setProfileError(""); }}
                  placeholder="Your full name"
                  disabled={profileMutation.isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailChanged(e.target.value.trim().toLowerCase() !== (data?.email ?? "").trim().toLowerCase());
                    setProfileSaved(false);
                    setProfileError("");
                  }}
                  placeholder="your@email.com"
                  disabled={profileMutation.isPending}
                />
              </div>
            </div>

            {emailChanged && (
              <EmailNotice
                variant="warning"
                message="Changing your email will trigger a verification email to your new address. Security notifications will also be sent to the updated address."
              />
            )}

            {profileSaved && emailChanged && (
              <EmailNotice
                variant="sent"
                message="Check your email — a verification link has been sent to your new address."
              />
            )}

            {profileError && <p className="text-xs text-red-400">{profileError}</p>}

            <Button
              size="sm"
              onClick={() => profileMutation.mutate()}
              disabled={profileMutation.isPending}
            >
              {profileMutation.isPending ? (
                <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Saving…</>
              ) : "Save Profile"}
            </Button>
          </>
        )}
      </div>

      {/* ── Password form ── */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold">Change Password</h3>
        </div>

        {passwordSaved ? (
          <EmailNotice
            variant="sent"
            message="Password updated. A confirmation email has been sent to your registered address."
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(""); }}
                    placeholder="Current password"
                    disabled={passwordMutation.isPending}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }}
                    placeholder="Min. 6 characters"
                    disabled={passwordMutation.isPending}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }}
                    placeholder="Repeat new password"
                    disabled={passwordMutation.isPending}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}

            <Button
              size="sm"
              onClick={handlePasswordSubmit}
              disabled={passwordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
            >
              {passwordMutation.isPending ? (
                <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Updating…</>
              ) : "Update Password"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
