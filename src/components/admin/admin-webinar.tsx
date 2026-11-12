"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, ExternalLink, Loader2, Mail, MessageCircle, Plus, Save, Search, Trash2, Upload, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

const SLUG = "positioning-2027";
const SITE_URL = "https://webinar.nojai.io";

interface Faq { question: string; answer: string }
interface Webinar {
  slug: string; isActive: boolean; registrationOpen: boolean;
  eyebrow?: string; headline: string; subheadline?: string; intro?: string;
  startsAt: string; durationMins: number; timezoneLabel?: string; platform?: string;
  joinUrl?: string; whatsappChannelUrl?: string; ctaText?: string;
  videoUrl?: string; videoPosterUrl?: string;
  learnHeading?: string; learnPoints: string[]; forYouPoints: string[]; notForYouPoints: string[];
  hostName?: string; hostTitle?: string; hostBio?: string; hostPhotoUrl?: string;
  faqs: Faq[]; disclaimer?: string; metaPixelId?: string;
  seoTitle?: string; seoDescription?: string; ogImageUrl?: string; updatedAt?: string;
}
interface Stats { total: number; last24h: number; emailFailed: number; byGoal: { goal: string; count: number }[]; bySource: { source: string; count: number }[] }
interface Registration {
  _id: string; fullName: string; email: string; phone: string; goal?: string; registrationCount: number;
  utmSource?: string; utmCampaign?: string; fbclid?: string; confirmationEmailStatus?: string; createdAt: string;
}

const GOAL_LABELS: Record<string, string> = {
  "protect-savings": "Protect savings", "second-income": "Second income", "start-investing": "Start investing",
  trading: "Trading", other: "Other", "not-said": "Not said",
};

// The page shows times in Lagos (WAT, UTC+1, no daylight saving).
const WAT_OFFSET_MS = 60 * 60 * 1000;
const toWatInput = (iso: string) => new Date(new Date(iso).getTime() + WAT_OFFSET_MS).toISOString().slice(0, 16);
const fromWatInput = (value: string) => new Date(new Date(`${value}:00.000Z`).getTime() - WAT_OFFSET_MS).toISOString();
const lines = (list: string[]) => list.join("\n");
const toList = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);

async function uploadToImageKit(file: File, folder: string) {
  const auth = (await api.get("/admin/uploads/imagekit-auth")).data as { publicKey: string; token: string; expire: number; signature: string };
  const form = new FormData();
  form.append("file", file);
  form.append("fileName", file.name);
  form.append("publicKey", auth.publicKey);
  form.append("token", auth.token);
  form.append("expire", String(auth.expire));
  form.append("signature", auth.signature);
  form.append("folder", folder);
  form.append("useUniqueFileName", "true");
  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", { method: "POST", body: form });
  const data = (await res.json()) as { url?: string; message?: string };
  if (!res.ok || !data.url) throw new Error(data.message ?? "Upload failed");
  return data.url;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function UploadButton({ accept, folder, onUploaded, label }: { accept: string; folder: string; onUploaded: (url: string) => void; label: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <input
        ref={input} type="file" accept={accept} className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          try {
            onUploaded(await uploadToImageKit(file, folder));
            toast.success("Uploaded. Remember to save.");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Upload failed");
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
        {busy ? "Uploading…" : label}
      </Button>
    </>
  );
}

function ContentEditor({ webinar }: { webinar: Webinar }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Webinar>(webinar);
  const [startsAtWat, setStartsAtWat] = useState(toWatInput(webinar.startsAt));
  const [listText, setListText] = useState({
    learnPoints: lines(webinar.learnPoints), forYouPoints: lines(webinar.forYouPoints), notForYouPoints: lines(webinar.notForYouPoints),
  });

  useEffect(() => {
    setForm(webinar);
    setStartsAtWat(toWatInput(webinar.startsAt));
    setListText({ learnPoints: lines(webinar.learnPoints), forYouPoints: lines(webinar.forYouPoints), notForYouPoints: lines(webinar.notForYouPoints) });
  }, [webinar]);

  const set = <K extends keyof Webinar>(key: K, value: Webinar[K]) => setForm((f) => ({ ...f, [key]: value }));
  const text = (key: keyof Webinar) => ({
    value: String(form[key] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value as never),
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        startsAt: fromWatInput(startsAtWat),
        learnPoints: toList(listText.learnPoints),
        forYouPoints: toList(listText.forYouPoints),
        notForYouPoints: toList(listText.notForYouPoints),
        faqs: form.faqs.filter((f) => f.question.trim() && f.answer.trim()),
      };
      return (await api.put(`/admin/webinar/${SLUG}`, payload)).data;
    },
    onSuccess: () => {
      toast.success("Saved. The live page updates within a minute.");
      queryClient.invalidateQueries({ queryKey: ["admin-webinar", SLUG] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const section = "space-y-4";
  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <Card>
        <CardHeader><CardTitle>Event</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Date and time (WAT)" hint="Lagos time. The countdown and calendar links use this.">
            <Input type="datetime-local" value={startsAtWat} onChange={(e) => setStartsAtWat(e.target.value)} required />
          </Field>
          <Field label="Duration (minutes)">
            <Input type="number" min={15} max={600} value={form.durationMins} onChange={(e) => set("durationMins", Number(e.target.value))} />
          </Field>
          <Field label="Platform"><Input {...text("platform")} placeholder="Zoom" /></Field>
          <Field label="Join link (private)" hint="Only registrants see this: in their confirmation email and on the thank-you page.">
            <Input {...text("joinUrl")} placeholder="https://zoom.us/j/…" />
          </Field>
          <div className="flex items-center justify-between rounded-xl border p-4">
            <div><p className="font-medium">Registration open</p><p className="text-xs text-muted-foreground">Turn off to stop new sign-ups.</p></div>
            <Switch checked={form.registrationOpen} onCheckedChange={(v) => set("registrationOpen", v)} />
          </div>
          <div className="flex items-center justify-between rounded-xl border p-4">
            <div><p className="font-medium">Page live</p><p className="text-xs text-muted-foreground">Turn off to take the page down.</p></div>
            <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Welcome video</CardTitle></CardHeader>
        <CardContent className={section}>
          <Field label="Video link" hint="Paste a YouTube or Vimeo link (unlisted works), or upload a video file.">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input {...text("videoUrl")} placeholder="https://youtu.be/…" />
              <UploadButton accept="video/*" folder="/webinar/videos" label="Upload video" onUploaded={(url) => set("videoUrl", url)} />
            </div>
          </Field>
          <Field label="Cover image (optional)" hint="Shown before the video plays (for uploaded videos).">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input {...text("videoPosterUrl")} placeholder="https://…" />
              <UploadButton accept="image/*" folder="/webinar/images" label="Upload image" onUploaded={(url) => set("videoPosterUrl", url)} />
            </div>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Hero</CardTitle></CardHeader>
        <CardContent className={section}>
          <Field label="Small label above the headline"><Input {...text("eyebrow")} /></Field>
          <Field label="Headline"><Textarea rows={2} {...text("headline")} required /></Field>
          <Field label="Subheadline"><Input {...text("subheadline")} /></Field>
          <Field label="Button text"><Input {...text("ctaText")} maxLength={60} /></Field>
          <Field label="Intro paragraph"><Textarea rows={4} {...text("intro")} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>What they'll learn & who it's for</CardTitle></CardHeader>
        <CardContent className={section}>
          <Field label="Section heading"><Input {...text("learnHeading")} /></Field>
          <Field label="What you'll learn" hint="One point per line.">
            <Textarea rows={6} value={listText.learnPoints} onChange={(e) => setListText((l) => ({ ...l, learnPoints: e.target.value }))} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="This is for you if…" hint="One per line.">
              <Textarea rows={5} value={listText.forYouPoints} onChange={(e) => setListText((l) => ({ ...l, forYouPoints: e.target.value }))} />
            </Field>
            <Field label="This is not for you if…" hint="One per line.">
              <Textarea rows={5} value={listText.notForYouPoints} onChange={(e) => setListText((l) => ({ ...l, notForYouPoints: e.target.value }))} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Host</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Name"><Input {...text("hostName")} /></Field>
          <Field label="Title"><Input {...text("hostTitle")} /></Field>
          <div className="md:col-span-2"><Field label="Bio"><Textarea rows={5} {...text("hostBio")} /></Field></div>
          <div className="md:col-span-2">
            <Field label="Photo" hint="Square photos look best.">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input {...text("hostPhotoUrl")} placeholder="https://…" />
                <UploadButton accept="image/*" folder="/webinar/images" label="Upload photo" onUploaded={(url) => set("hostPhotoUrl", url)} />
              </div>
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>FAQ</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => set("faqs", [...form.faqs, { question: "", answer: "" }])}>
            <Plus className="mr-1.5 h-4 w-4" /> Add question
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.faqs.map((faq, i) => (
            <div key={i} className="space-y-2 rounded-xl border p-4">
              <div className="flex gap-2">
                <Input value={faq.question} placeholder="Question" onChange={(e) => set("faqs", form.faqs.map((f, j) => (j === i ? { ...f, question: e.target.value } : f)))} />
                <Button type="button" variant="ghost" size="icon" aria-label="Remove question" onClick={() => set("faqs", form.faqs.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea rows={2} value={faq.answer} placeholder="Answer" onChange={(e) => set("faqs", form.faqs.map((f, j) => (j === i ? { ...f, answer: e.target.value } : f)))} />
            </div>
          ))}
          {!form.faqs.length ? <p className="text-sm text-muted-foreground">No questions yet.</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Links, tracking & sharing</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="WhatsApp channel link"><Input {...text("whatsappChannelUrl")} /></Field>
          <Field label="Meta Pixel ID (optional)" hint="Digits only. Tracks visits and sign-ups for Facebook/Instagram ads.">
            <Input {...text("metaPixelId")} inputMode="numeric" />
          </Field>
          <Field label="Search / share title"><Input {...text("seoTitle")} /></Field>
          <Field label="Share image (1200×630)">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input {...text("ogImageUrl")} placeholder="https://…" />
              <UploadButton accept="image/*" folder="/webinar/images" label="Upload" onUploaded={(url) => set("ogImageUrl", url)} />
            </div>
          </Field>
          <div className="md:col-span-2"><Field label="Search / share description"><Textarea rows={2} {...text("seoDescription")} /></Field></div>
          <div className="md:col-span-2"><Field label="Disclaimer (footer)"><Textarea rows={3} {...text("disclaimer")} /></Field></div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button type="submit" size="lg" disabled={save.isPending} className="shadow-lg">
          {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save changes
        </Button>
      </div>
    </form>
  );
}

function RegistrationsTable() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => { setQuery(search.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(id);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-webinar-registrations", SLUG, query, page],
    queryFn: async () => (await api.get(`/admin/webinar/${SLUG}/registrations`, { params: { page, limit: 25, search: query || undefined } })).data as { registrations: Registration[]; total: number; pages: number },
  });

  async function exportCsv() {
    setExporting(true);
    try {
      const res = await api.get(`/admin/webinar/${SLUG}/registrations.csv`, { params: { search: query || undefined }, responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${SLUG}-registrations.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Registrations {data ? <span className="text-muted-foreground">({data.total.toLocaleString()})</span> : null}</CardTitle>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="w-56 pl-9" placeholder="Name, email or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={exporting}>
            {exporting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />} CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !data?.registrations.length ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{query ? "No matches." : "No registrations yet. Share the page to get the first ones."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Name</th><th className="py-2 pr-3">Contact</th><th className="py-2 pr-3">Goal</th>
                  <th className="py-2 pr-3">Source</th><th className="py-2 pr-3">Email</th><th className="py-2 pr-3">Registered</th><th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {data.registrations.map((r) => (
                  <tr key={r._id} className="border-b last:border-0">
                    <td className="py-3 pr-3 font-medium">{r.fullName}{r.registrationCount > 1 ? <Badge variant="secondary" className="ml-2">×{r.registrationCount}</Badge> : null}</td>
                    <td className="py-3 pr-3"><div>{r.email}</div><div className="text-xs text-muted-foreground">{r.phone}</div></td>
                    <td className="py-3 pr-3">{r.goal ? GOAL_LABELS[r.goal] ?? r.goal : <span className="text-muted-foreground">—</span>}</td>
                    <td className="py-3 pr-3">{r.utmSource ?? (r.fbclid ? "facebook" : "direct")}{r.utmCampaign ? <div className="text-xs text-muted-foreground">{r.utmCampaign}</div> : null}</td>
                    <td className="py-3 pr-3">
                      {r.confirmationEmailStatus === "sent" ? <Badge variant="success">Sent</Badge>
                        : r.confirmationEmailStatus === "failed" ? <Badge variant="destructive">Failed</Badge>
                        : <Badge variant="secondary">{r.confirmationEmailStatus ?? "—"}</Badge>}
                    </td>
                    <td className="whitespace-nowrap py-3 pr-3 text-muted-foreground">{new Date(r.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="py-3">
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" aria-label={`WhatsApp ${r.fullName}`}>
                          <a href={`https://wa.me/${r.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" /></a>
                        </Button>
                        <Button asChild variant="ghost" size="icon" aria-label={`Email ${r.fullName}`}>
                          <a href={`mailto:${r.email}`}><Mail className="h-4 w-4" /></a>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.pages > 1 ? (
          <div className="mt-4 flex items-center justify-end gap-2 text-sm">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="text-muted-foreground">Page {page} of {data.pages}</span>
            <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function AdminWebinar() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-webinar", SLUG],
    queryFn: async () => (await api.get(`/admin/webinar/${SLUG}`)).data as { webinar: Webinar; stats: Stats },
  });

  const topGoal = useMemo(() => data?.stats.byGoal.find((g) => g.goal !== "not-said"), [data]);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error || !data) return <p className="py-20 text-center text-sm text-muted-foreground">Couldn't load the webinar. {error instanceof Error ? error.message : ""}</p>;

  const { webinar, stats } = data;
  const tile = "rounded-2xl border bg-card p-4";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Webinar</h1>
          <p className="text-sm text-muted-foreground">{webinar.headline}</p>
        </div>
        <div className="flex items-center gap-2">
          {webinar.registrationOpen && webinar.isActive ? <Badge variant="success">Registration open</Badge> : <Badge variant="warning">{webinar.isActive ? "Registration closed" : "Page offline"}</Badge>}
          <Button asChild variant="outline"><a href={SITE_URL} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1.5 h-4 w-4" /> Open page</a></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={tile}><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" /> Registrations</p><p className="mt-1 text-2xl font-bold">{stats.total.toLocaleString()}</p></div>
        <div className={tile}><p className="text-xs text-muted-foreground">Last 24 hours</p><p className="mt-1 text-2xl font-bold">{stats.last24h.toLocaleString()}</p></div>
        <div className={tile}><p className="text-xs text-muted-foreground">Top goal</p><p className="mt-1 truncate text-lg font-semibold">{topGoal ? `${GOAL_LABELS[topGoal.goal] ?? topGoal.goal} (${topGoal.count})` : "—"}</p></div>
        <div className={tile}><p className="text-xs text-muted-foreground">Top source</p><p className="mt-1 truncate text-lg font-semibold">{stats.bySource[0] ? `${stats.bySource[0].source} (${stats.bySource[0].count})` : "—"}</p></div>
      </div>
      {stats.emailFailed > 0 ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">{stats.emailFailed} confirmation email{stats.emailFailed === 1 ? "" : "s"} failed to send. Those people still have their seat; reach them on WhatsApp from the Registrations tab.</p>
      ) : null}

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Page content</TabsTrigger>
          <TabsTrigger value="registrations">Registrations</TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="mt-4"><ContentEditor webinar={webinar} /></TabsContent>
        <TabsContent value="registrations" className="mt-4"><RegistrationsTable /></TabsContent>
      </Tabs>
    </div>
  );
}
