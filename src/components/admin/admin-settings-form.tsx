"use client";

import { useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { ProfileSettingsForm } from "@/components/dashboard/profile-settings-form";
import { AdminMartingaleSettings } from "@/components/admin/admin-martingale-settings";

export function AdminSettingsForm() {
  const [value, setValue] = useState(`{
  "maintenanceMode": false,
  "supportEmail": "support@nojai.app"
}`);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = JSON.parse(value);
      await api.put("/admin/settings", payload);
    },
    onSuccess: () => toast.success("Global settings updated"),
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="space-y-8">
      {/* Profile */}
      <div>
        <h2 className="font-display text-base font-bold mb-4">Profile Settings</h2>
        <ProfileSettingsForm />
      </div>

      {/* Martingale */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
        <AdminMartingaleSettings />
      </div>

      {/* System settings */}
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-json">JSON payload</Label>
            <Textarea id="settings-json" value={value} onChange={(event) => setValue(event.target.value)} className="min-h-[260px] font-mono text-xs" />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save settings"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}