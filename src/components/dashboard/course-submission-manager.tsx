"use client";

import { useRef, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, FileIcon, ImagePlus, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { Course, CourseAsset } from "@/types";

interface IKAuthResponse {
  publicKey: string;
  urlEndpoint: string;
  token: string;
  expire: number;
  signature: string;
  folder?: string;
}

const EMPTY_FORM = {
  title: "",
  description: "",
  content: "",
  videoUrl: "",
  accessType: "free" as "free" | "paid",
  price: "",
  currency: "USD" as "USD" | "NGN",
  coverImage: "",
  assets: [] as CourseAsset[],
};

function guessAssetType(mimeType: string): CourseAsset["type"] {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("rar") || mimeType.includes("7z")) return "archive";
  if (mimeType.includes("word") || mimeType.includes("document") || mimeType.includes("text") || mimeType.includes("sheet") || mimeType.includes("presentation")) return "document";
  return "other";
}

async function uploadToImageKit(file: File, folderSuffix: "covers" | "assets"): Promise<CourseAsset> {
  const authRes = await api.get("/user/uploads/imagekit-auth");
  const auth = authRes.data as IKAuthResponse;
  const folder = `${auth.folder ?? "/nojai/course-submissions"}/${folderSuffix}`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", file.name);
  formData.append("publicKey", auth.publicKey);
  formData.append("token", auth.token);
  formData.append("expire", String(auth.expire));
  formData.append("signature", auth.signature);
  formData.append("folder", folder);
  formData.append("useUniqueFileName", "true");

  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", { method: "POST", body: formData });
  const data = await res.json() as { url?: string; fileId?: string; thumbnailUrl?: string; name?: string; message?: string; size?: number };
  if (!res.ok) throw new Error(data.message ?? "Upload failed");

  return {
    name: file.name,
    url: String(data.url ?? ""),
    type: guessAssetType(file.type),
    fileId: String(data.fileId ?? ""),
    mimeType: file.type,
    size: data.size ?? file.size,
    thumbnailUrl: data.thumbnailUrl ?? "",
    folder,
  };
}

function statusBadgeVariant(status?: Course["approvalStatus"]) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "warning" as const;
  return "outline" as const;
}

export function CourseSubmissionManager() {
  const queryClient = useQueryClient();
  const assetInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);

  const { data: submissions = [], isLoading } = useQuery<Course[]>({
    queryKey: ["course-submissions"],
    queryFn: async () => {
      const res = await api.get("/user/courses/submissions");
      return Array.isArray(res.data) ? (res.data as Course[]) : [];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        content: form.content.trim(),
        videoUrl: form.videoUrl.trim() || undefined,
        accessType: form.accessType,
        price: form.accessType === "paid" ? Number(form.price) : 0,
        currency: form.currency,
        coverImage: form.coverImage.trim() || undefined,
        assets: form.assets,
      };
      return api.post("/user/courses", payload);
    },
    onSuccess: () => {
      toast.success("Course submitted for admin approval");
      setForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: ["course-submissions"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const asset = await uploadToImageKit(file, "covers");
      setForm((current) => ({ ...current, coverImage: asset.url }));
      toast.success("Cover uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  }

  async function handleAssetUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadingAsset(true);
    try {
      const uploaded = await Promise.all(files.map((file) => uploadToImageKit(file, "assets")));
      setForm((current) => ({ ...current, assets: [...current.assets, ...uploaded] }));
      toast.success(`${uploaded.length} file${uploaded.length === 1 ? "" : "s"} uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingAsset(false);
      if (assetInputRef.current) assetInputRef.current.value = "";
    }
  }

  function copyShareLink(course: Course) {
    const url = course.shareUrl || `${window.location.origin}/courses/${course.slug || course._id}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success("Course link copied"))
      .catch(() => toast.error("Could not copy link"));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Submit a course</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Title *</Label>
              <Input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} placeholder="Course title" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Short description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} placeholder="What students will learn" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Course content *</Label>
              <Textarea rows={6} value={form.content} onChange={(e) => setForm((current) => ({ ...current, content: e.target.value }))} placeholder="Lesson notes, outline, markdown, or HTML" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Main video URL</Label>
              <Input value={form.videoUrl} onChange={(e) => setForm((current) => ({ ...current, videoUrl: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Access</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["free", "paid"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, accessType: value }))}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      form.accessType === value ? "border-primary/40 bg-primary/10 text-foreground" : "border-white/10 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {value === "free" ? "Free" : "Paid"}
                  </button>
                ))}
              </div>
            </div>
            {form.accessType === "paid" && (
              <div className="grid grid-cols-[1fr_96px] gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Price *</Label>
                  <Input type="number" min="0" value={form.price} onChange={(e) => setForm((current) => ({ ...current, price: e.target.value }))} placeholder="49" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Currency</Label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm((current) => ({ ...current, currency: e.target.value as "USD" | "NGN" }))}
                    className="h-10 w-full rounded-full border border-input bg-background px-3 text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="NGN">NGN</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Cover image</Label>
            {form.coverImage ? (
              <div className="relative overflow-hidden rounded-2xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.coverImage} alt="Course cover" className="h-36 w-full object-cover" />
                <button type="button" onClick={() => setForm((current) => ({ ...current, coverImage: "" }))} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70">
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] py-5 text-sm text-muted-foreground hover:border-white/30">
                {uploadingCover ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                {uploadingCover ? "Uploading..." : "Upload cover image"}
                <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploadingCover} />
              </label>
            )}
            <Input value={form.coverImage} onChange={(e) => setForm((current) => ({ ...current, coverImage: e.target.value }))} placeholder="Or paste image URL" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Course materials</Label>
            <button
              type="button"
              disabled={uploadingAsset}
              onClick={() => assetInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] py-5 text-sm text-muted-foreground hover:border-white/30 disabled:cursor-not-allowed"
            >
              {uploadingAsset ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileIcon className="h-5 w-5" />}
              {uploadingAsset ? "Uploading..." : "Upload PDFs, videos, docs, images, or zip files"}
            </button>
            <input ref={assetInputRef} type="file" multiple accept="*/*" className="hidden" onChange={handleAssetUpload} disabled={uploadingAsset} />
            {form.assets.length > 0 && (
              <div className="space-y-2">
                {form.assets.map((asset, index) => (
                  <div key={`${asset.url}-${index}`} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
                    <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">{asset.type}</p>
                    </div>
                    <button type="button" onClick={() => setForm((current) => ({ ...current, assets: current.assets.filter((_, itemIndex) => itemIndex !== index) }))}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || uploadingCover || uploadingAsset || !form.title.trim() || !form.content.trim() || (form.accessType === "paid" && Number(form.price) <= 0)}
          >
            {submitMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit for approval
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your submissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : submissions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No submitted courses yet.</p>
          ) : (
            submissions.map((course) => (
              <div key={course._id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug">{course.title}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">/{course.slug || course._id}</p>
                  </div>
                  <Badge variant={statusBadgeVariant(course.approvalStatus)}>
                    {course.approvalStatus ?? "pending"}
                  </Badge>
                </div>
                {course.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{course.description}</p>}
                {course.rejectionReason && (
                  <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/[0.05] p-3 text-xs text-red-200">{course.rejectionReason}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {course.approvalStatus === "approved" && (
                    <Button size="sm" variant="outline" onClick={() => copyShareLink(course)}>
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Copy link
                    </Button>
                  )}
                  <Badge variant={course.accessType === "paid" ? "default" : "secondary"}>
                    {course.accessType === "paid" ? `Paid ${course.price ?? 0} ${course.currency ?? "USD"}` : "Free"}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
