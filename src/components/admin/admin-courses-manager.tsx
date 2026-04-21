"use client";

import { useRef, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileIcon, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { Course, CourseAsset } from "@/types";

interface IKAuthResponse {
  publicKey: string;
  urlEndpoint: string;
  token: string;
  expire: number;
  signature: string;
}

function guessAssetType(mimeType: string): CourseAsset["type"] {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("rar") || mimeType.includes("7z")) return "archive";
  if (mimeType.includes("word") || mimeType.includes("document") || mimeType.includes("text") || mimeType.includes("sheet") || mimeType.includes("presentation")) return "document";
  return "other";
}

async function uploadToImageKit(file: File, folder: string): Promise<CourseAsset> {
  const authRes = await api.get("/admin/uploads/imagekit-auth");
  const auth = authRes.data as IKAuthResponse;

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
  const data = await res.json() as { url?: string; fileId?: string; thumbnailUrl?: string; filePath?: string; name?: string; message?: string; size?: number };
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

const EMPTY_FORM = {
  title: "",
  description: "",
  content: "",
  videoUrl: "",
  order: "",
  accessType: "free" as "free" | "paid",
  price: "",
  currency: "USD" as "USD" | "NGN",
  coverImage: "",
  published: true,
  assets: [] as CourseAsset[],
};

export function AdminCoursesManager() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const assetInputRef = useRef<HTMLInputElement>(null);

  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const res = await api.get("/admin/courses");
      return Array.isArray(res.data) ? (res.data as Course[]) : [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        content: form.content.trim(),
        videoUrl: form.videoUrl.trim() || undefined,
        order: form.order !== "" ? Number(form.order) : 0,
        accessType: form.accessType,
        price: form.accessType === "paid" ? Number(form.price) : 0,
        currency: form.currency,
        coverImage: form.coverImage.trim() || undefined,
        published: form.published,
        assets: form.assets,
      };
      if (editing) return api.put(`/admin/courses/${editing._id}`, payload);
      return api.post("/admin/courses", payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Course updated" : "Course created");
      setEditing(null);
      setForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/courses/${id}`),
    onSuccess: () => {
      toast.success("Course deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function startEdit(course: Course) {
    setEditing(course);
    setForm({
      title: course.title ?? "",
      description: course.description ?? "",
      content: course.content ?? "",
      videoUrl: course.videoUrl ?? "",
      order: course.order !== undefined ? String(course.order) : "",
      accessType: (course.accessType ?? "free") as "free" | "paid",
      price: course.price !== undefined ? String(course.price) : "",
      currency: (course.currency ?? "USD") as "USD" | "NGN",
      coverImage: course.coverImage ?? "",
      published: course.published ?? true,
      assets: Array.isArray(course.assets) ? course.assets : [],
    });
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const asset = await uploadToImageKit(file, "/nojai/courses/covers");
      setForm((f) => ({ ...f, coverImage: asset.url }));
      toast.success("Cover uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleAssetUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadingAsset(true);
    try {
      const uploaded = await Promise.all(files.map((f) => uploadToImageKit(f, "/nojai/courses/assets")));
      setForm((f) => ({ ...f, assets: [...f.assets, ...uploaded] }));
      toast.success(`${uploaded.length} file${uploaded.length !== 1 ? "s" : ""} uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingAsset(false);
      if (assetInputRef.current) assetInputRef.current.value = "";
    }
  }

  function removeAsset(idx: number) {
    setForm((f) => ({ ...f, assets: f.assets.filter((_, i) => i !== idx) }));
  }

  function cancelEdit() {
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  function fmtSize(bytes?: number) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      {/* ── Form ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{editing ? "Edit course" : "Create course"}</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Published</span>
              <Switch checked={form.published} onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <Label className="text-xs">Title *</Label>
            <Input placeholder="Course title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label className="text-xs">Short description</Label>
            <Textarea rows={2} placeholder="Brief summary shown on course cards" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>

          {/* Content */}
          <div className="space-y-1">
            <Label className="text-xs">Course content</Label>
            <Textarea rows={6} placeholder="Main course content (text, markdown, HTML)" value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
          </div>

          {/* Video URL */}
          <div className="space-y-1">
            <Label className="text-xs">Main video URL (optional)</Label>
            <Input placeholder="https://youtu.be/..." value={form.videoUrl} onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))} />
          </div>

          {/* Order */}
          <div className="space-y-1">
            <Label className="text-xs">Order</Label>
            <Input type="number" placeholder="0" value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))} />
          </div>

          {/* Access type */}
          <div className="space-y-2">
            <Label className="text-xs">Access type</Label>
            <div className="flex gap-2">
              {(["free", "paid"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, accessType: t }))}
                  className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${
                    form.accessType === t ? "border-primary/40 bg-primary/[0.08] text-foreground" : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "free" ? "Free" : "Paid"}
                </button>
              ))}
            </div>
          </div>

          {/* Price + currency (only if paid) */}
          {form.accessType === "paid" && (
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Price *</Label>
                <Input type="number" min="0" placeholder="e.g. 49" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="w-28 space-y-1">
                <Label className="text-xs">Currency</Label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as "USD" | "NGN" }))}
                  className="h-10 w-full rounded-xl border border-input bg-background/70 px-3 text-sm"
                >
                  <option value="USD">USD</option>
                  <option value="NGN">NGN</option>
                </select>
              </div>
            </div>
          )}

          {/* Cover image */}
          <div className="space-y-2">
            <Label className="text-xs">Cover image</Label>
            {form.coverImage ? (
              <div className="relative w-full overflow-hidden rounded-xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.coverImage} alt="Cover" className="h-32 w-full object-cover" />
                <button type="button" aria-label="Remove cover" onClick={() => setForm((f) => ({ ...f, coverImage: "" }))} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 hover:bg-black/80">
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.02] py-5 text-sm text-muted-foreground hover:border-white/30">
                {uploadingCover ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                {uploadingCover ? "Uploading..." : "Click to upload cover image"}
                <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploadingCover} />
              </label>
            )}
            <Input placeholder="Or paste an image URL" value={form.coverImage} onChange={(e) => setForm((f) => ({ ...f, coverImage: e.target.value }))} />
          </div>

          {/* Course asset uploads */}
          <div className="space-y-2">
            <Label className="text-xs">Course materials (PDF, video, audio, docs, images, zip…)</Label>
            <button
              type="button"
              disabled={uploadingAsset}
              onClick={() => assetInputRef.current?.click()}
              className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.02] py-5 text-sm text-muted-foreground hover:border-white/30 disabled:cursor-not-allowed"
            >
              {uploadingAsset ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileIcon className="h-5 w-5" />}
              {uploadingAsset ? "Uploading..." : "Click to upload files"}
            </button>
            <input ref={assetInputRef} type="file" multiple accept="*/*" className="hidden" onChange={handleAssetUpload} disabled={uploadingAsset} />

            {form.assets.length > 0 && (
              <div className="space-y-2">
                {form.assets.map((asset, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{asset.name}</p>
                      <p className="text-[10px] text-muted-foreground">{asset.type}{asset.size ? ` · ${fmtSize(asset.size)}` : ""}</p>
                    </div>
                    <button type="button" aria-label="Remove" onClick={() => removeAsset(idx)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || uploadingCover || uploadingAsset || !form.title.trim() || !form.content.trim()}>
              {saveMutation.isPending ? "Saving..." : editing ? "Update course" : "Create course"}
            </Button>
            {editing && <Button variant="outline" onClick={cancelEdit}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>

      {/* ── Course list ── */}
      <Card>
        <CardHeader><CardTitle>Courses ({courses.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : courses.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No courses yet.</p>
          ) : (
            courses.map((course) => (
              <div key={course._id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                {course.coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={course.coverImage} alt={course.title} className="mb-3 h-28 w-full rounded-xl object-cover" />
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug">{course.title}</p>
                    {course.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{course.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant={course.accessType === "paid" ? "default" : "secondary"}>
                        {course.accessType === "paid" ? `Paid · ${course.price} ${course.currency ?? "USD"}` : "Free"}
                      </Badge>
                      <Badge variant={course.published ? "success" : "outline"}>
                        {course.published ? "Published" : "Draft"}
                      </Badge>
                      {(course.assets ?? []).length > 0 && (
                        <Badge variant="outline">{(course.assets ?? []).length} asset{(course.assets ?? []).length !== 1 ? "s" : ""}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => startEdit(course)}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => { if (course._id) deleteMutation.mutate(course._id); }} disabled={deleteMutation.isPending}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}