"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, ImagePlus, Loader2, Play, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { BlogPost } from "@/types";

type BlogMedia = NonNullable<BlogPost["mediaGallery"]>[number];

type BlogFormValues = {
  title: string;
  excerpt: string;
  content: string;
  author: string;
  coverImage: string;
  featuredVideo: string;
  mediaGallery: BlogMedia[];
  published: boolean;
};

const emptyPost: BlogFormValues = {
  title: "",
  excerpt: "",
  content: "",
  author: "",
  coverImage: "",
  featuredVideo: "",
  mediaGallery: [],
  published: true,
};

const seoBlogTemplate = `## Overview
Explain the problem this article solves in simple terms.

## Why this matters
Describe the impact for users and what changes when this is done correctly.

## Step-by-step setup
1. Step one with exact action.
2. Step two with exact action.
3. Step three with exact action.

## Common mistakes
- Mistake one and how to avoid it.
- Mistake two and how to avoid it.

## Best practices
- Clear, factual guidance.
- Risk notes where needed.

## FAQ
### Question 1
Answer with direct, concise details.

### Question 2
Answer with direct, concise details.

## Conclusion
Summarize key takeaways and next action.`;

function toSlug(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return slug || `post-${Date.now()}`;
}

interface ImageKitAuthResponse {
  publicKey: string;
  urlEndpoint: string;
  token: string;
  expire: number;
  signature: string;
}

interface ImageKitUploadResponse {
  url?: string;
  fileId?: string;
  name?: string;
  message?: string;
}

async function uploadBlogAsset(file: File, folder = "/nojai/blog"): Promise<BlogMedia> {
  const authResponse = await api.get("/admin/uploads/imagekit-auth");
  const auth = authResponse.data as ImageKitAuthResponse;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", file.name);
  formData.append("publicKey", auth.publicKey);
  formData.append("token", auth.token);
  formData.append("expire", String(auth.expire));
  formData.append("signature", auth.signature);
  formData.append("folder", folder);
  formData.append("useUniqueFileName", "true");

  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as ImageKitUploadResponse;
  if (!response.ok) throw new Error(data.message ?? "Failed to upload media");
  if (!data.url) throw new Error("Upload finished without a media URL");

  return {
    kind: file.type.startsWith("video/") ? "video" : "image",
    url: data.url,
    fileId: data.fileId,
    name: data.name ?? file.name,
  };
}

function applyPostToForm(post: BlogPost): BlogFormValues {
  return {
    title: post.title,
    excerpt: post.excerpt ?? "",
    content: post.content,
    author: post.author ?? "",
    coverImage: post.coverImage ?? "",
    featuredVideo: post.featuredVideo ?? "",
    mediaGallery: post.mediaGallery ?? [],
    published: post.published ?? false,
  };
}

export function AdminBlogManager() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [values, setValues] = useState<BlogFormValues>(emptyPost);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const { data: posts = [] } = useQuery({
    queryKey: ["admin-blog"],
    queryFn: async () => {
      const res = await api.get("/admin/blog");
      const d = res.data as { posts?: BlogPost[] } | BlogPost[];
      return Array.isArray(d) ? d : (Array.isArray(d?.posts) ? d.posts : []);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = editing?.slug ?? toSlug(values.title);
      const payload = {
        ...values,
        slug,
        author: values.author.trim() || "NOJAI Editorial",
        mediaGallery: values.mediaGallery.filter((item) => item.url),
      };
      if (editing) return api.put(`/admin/blog/${editing._id}`, payload);
      return api.post("/admin/blog", payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Post updated" : "Post published");
      setEditing(null);
      setValues(emptyPost);
      queryClient.invalidateQueries({ queryKey: ["admin-blog"] });
      queryClient.invalidateQueries({ queryKey: ["blog"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/blog/${id}`),
    onSuccess: () => {
      toast.success("Post deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-blog"] });
      queryClient.invalidateQueries({ queryKey: ["blog"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const handleGalleryUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadingGallery(true);
    try {
      const uploaded = await Promise.all(Array.from(files).map((file) => uploadBlogAsset(file, "/nojai/blog/media")));
      setValues((v) => ({ ...v, mediaGallery: [...v.mediaGallery, ...uploaded] }));
      toast.success(`${uploaded.length} media file${uploaded.length === 1 ? "" : "s"} uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingGallery(false);
    }
  };

  const savingDisabled = saveMutation.isPending || uploadingCover || uploadingGallery || !values.title.trim() || !values.content.trim();

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <CardHeader>
          <CardTitle className="text-slate-950 dark:text-white">{editing ? "Edit post" : "New blog post"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Title"
            rows={2}
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            className="resize-none"
          />

          {values.coverImage ? (
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
              <Image src={values.coverImage} alt="Cover" width={900} height={480} className="h-48 w-full object-cover" unoptimized />
              <button
                type="button"
                aria-label="Remove cover image"
                onClick={() => setValues((v) => ({ ...v, coverImage: "" }))}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/75 text-white hover:bg-slate-950"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-8 text-sm font-medium text-slate-600 transition-colors hover:border-primary/50 hover:bg-primary/5 dark:border-white/15 dark:bg-white/[0.03] dark:text-white/60">
              {uploadingCover ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              {uploadingCover ? "Uploading..." : "Upload cover image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingCover}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadingCover(true);
                  try {
                    const media = await uploadBlogAsset(file);
                    setValues((v) => ({ ...v, coverImage: media.url }));
                    toast.success("Cover image uploaded");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Upload failed");
                  } finally {
                    setUploadingCover(false);
                    e.target.value = "";
                  }
                }}
              />
            </label>
          )}

          <Textarea
            placeholder="Short excerpt shown in the blog list"
            rows={3}
            value={values.excerpt}
            onChange={(e) => setValues((v) => ({ ...v, excerpt: e.target.value }))}
            className="resize-none"
          />

          <Textarea
            placeholder="Author name (e.g. NOJAI Editorial)"
            rows={1}
            value={values.author}
            onChange={(e) => setValues((v) => ({ ...v, author: e.target.value }))}
            className="resize-none"
          />

          <Textarea
            placeholder="Featured video URL (optional)"
            rows={1}
            value={values.featuredVideo}
            onChange={(e) => setValues((v) => ({ ...v, featuredVideo: e.target.value }))}
            className="resize-none"
          />

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-white">Gallery images and videos</p>
                <p className="text-xs text-slate-500 dark:text-white/50">Attach multiple screenshots, images, or videos to this article.</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]">
                {uploadingGallery ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                Upload media
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  disabled={uploadingGallery}
                  onChange={async (e) => {
                    await handleGalleryUpload(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {values.mediaGallery.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {values.mediaGallery.map((item, index) => (
                  <div key={`${item.url}-${index}`} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-black/20">
                    {item.kind === "video" ? (
                      <div className="flex aspect-video items-center justify-center bg-slate-950 text-white">
                        <Play className="h-8 w-8" />
                      </div>
                    ) : (
                      <Image src={item.url} alt={item.name ?? "Gallery image"} width={480} height={270} className="aspect-video w-full object-cover" unoptimized />
                    )}
                    <button
                      type="button"
                      aria-label="Remove media"
                      onClick={() => setValues((v) => ({ ...v, mediaGallery: v.mediaGallery.filter((_, i) => i !== index) }))}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/75 text-white hover:bg-slate-950"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <p className="truncate px-3 py-2 text-xs font-medium text-slate-600 dark:text-white/60">{item.name ?? item.kind}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <Textarea
            placeholder="Write your post content here..."
            rows={12}
            value={values.content}
            onChange={(e) => setValues((v) => ({ ...v, content: e.target.value }))}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setValues((v) => ({ ...v, content: v.content.trim() ? v.content : seoBlogTemplate }))}
          >
            Insert SEO content template
          </Button>

          <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-800 dark:text-white/80">
            <input
              type="checkbox"
              checked={values.published}
              onChange={(e) => setValues((v) => ({ ...v, published: e.target.checked }))}
            />
            Publish immediately
          </label>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => saveMutation.mutate()} disabled={savingDisabled}>
              {saveMutation.isPending ? "Saving..." : editing ? "Update post" : "Publish post"}
            </Button>
            {editing ? (
              <Button variant="outline" onClick={() => { setEditing(null); setValues(emptyPost); }}>Cancel</Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <CardHeader>
          <CardTitle className="text-slate-950 dark:text-white">All posts ({posts.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {posts.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-white/50">No posts yet. Create one above.</p>
          ) : null}
          {posts.map((post) => {
            const galleryCount = post.mediaGallery?.length ?? 0;
            return (
              <div key={post._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-white/10 dark:bg-black/20">
                {post.coverImage ? (
                  <Image src={post.coverImage} alt={post.title} width={720} height={360} className="mb-3 h-40 w-full rounded-xl object-cover" unoptimized />
                ) : null}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold leading-snug text-slate-950 dark:text-white">{post.title}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-white/45">/{post.slug}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${post.published ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-slate-200 text-slate-600 dark:bg-white/[0.08] dark:text-white/50"}`}>
                    {post.published ? "Published" : "Draft"}
                  </span>
                </div>
                {post.excerpt ? <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-white/60">{post.excerpt}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-500 dark:text-white/45">
                  {post.featuredVideo ? <span>Featured video</span> : null}
                  {galleryCount > 0 ? <span>{galleryCount} gallery file{galleryCount === 1 ? "" : "s"}</span> : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(post);
                      setValues(applyPostToForm(post));
                    }}
                  >
                    Edit
                  </Button>
                  {post.published && post.slug ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/blog/${encodeURIComponent(post.slug)}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        View live
                      </Link>
                    </Button>
                  ) : null}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => deleteMutation.mutate(post._id)}
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
