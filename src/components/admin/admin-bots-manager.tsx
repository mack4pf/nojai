"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { normalizeArray } from "@/lib/utils";
import type { Bot } from "@/types";

const emptyBot = { name: "", description: "", isActive: true };

export function AdminBotsManager() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState(emptyBot);

  const { data: bots = [] } = useQuery({
    queryKey: queryKeys.adminBots,
    queryFn: async () => normalizeArray<Bot>((await api.get("/admin/bots")).data),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        await api.put(`/admin/bots/${editingId}`, values);
        return;
      }

      await api.post("/admin/bots", values);
    },
    onSuccess: () => {
      toast.success(editingId ? "Bot updated" : "Bot created");
      setValues(emptyBot);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBots });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit bot" : "Create bot"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="bot-name">Name</Label>
            <Input id="bot-name" value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bot-description">Description</Label>
            <Textarea id="bot-description" value={values.description} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} />
          </div>
          <label className="flex items-center gap-3 text-sm text-muted-foreground">
            <input type="checkbox" checked={values.isActive} onChange={(event) => setValues((current) => ({ ...current, isActive: event.target.checked }))} />
            Active
          </label>
          <div className="flex gap-3">
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : editingId ? "Update bot" : "Create bot"}</Button>
            {editingId ? <Button variant="outline" onClick={() => { setEditingId(null); setValues(emptyBot); }}>Cancel</Button> : null}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Existing bots</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {bots.map((bot) => (
            <div key={bot._id ?? bot.name} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="font-medium text-foreground">{bot.name}</p>
              <p className="mt-2 text-sm text-muted-foreground">{bot.description}</p>
              <div className="mt-4 flex gap-3">
                <Button variant="outline" onClick={() => { setEditingId(bot._id ?? null); setValues({ name: bot.name, description: bot.description ?? "", isActive: bot.isActive }); }}>Edit</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}