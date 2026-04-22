"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { BlogPost } from "@/types";

type BlogFormValues = {
  title: string;
  excerpt: string;
  content: string;
  author: string;
  coverImage: string;
  published: boolean;
};

const emptyPost: BlogFormValues = {
  title: "",
  excerpt: "",
  content: "",
  author: "",
  coverImage: "",
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
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

interface ImageKitAuthResponse {
  publicKey: string;
  urlEndpoint: string;
  token: string;
  expire: number;
  signature: string;
}

async function uploadCoverImage(file: File): Promise<string> {
  const authResponse = await api.get("/admin/uploads/imagekit-auth");
  const auth = authResponse.data as ImageKitAuthResponse;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", file.name);
  formData.append("publicKey", auth.publicKey);
  formData.append("token", auth.token);
  formData.append("expire", String(auth.expire));
  formData.append("signature", auth.signature);
  formData.append("folder", "/nojai/blog");
  formData.append("useUniqueFileName", "true");

  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    body: formData,
  });

  const data = await response.json() as { url?: string; message?: string };
  if (!response.ok) throw new Error(data.message ?? "Failed to upload image");
  return String(data.url ?? "");
}

export function AdminBlogManager() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [values, setValues] = useState(emptyPost);
  const [uploading, setUploading] = useState(false);

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
      const payload = { ...values, slug, author: values.author.trim() || "NOJAI Editorial" };
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

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      {/* ── Form ── */}
      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit post" : "New blog post"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Title"
            rows={2}
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            className="resize-none"
          />

          {/* Cover image upload */}
          {values.coverImage ? (
            <div className="relative overflow-hidden rounded-xl">
              <Image src={values.coverImage} alt="Cover" width={800} height={400} className="h-44 w-full object-cover" unoptimized />
              <button
                type="button"
                aria-label="Remove cover image"
                onClick={() => setValues((v) => ({ ...v, coverImage: "" }))}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.02] py-8 text-sm text-muted-foreground transition-colors hover:border-white/30 hover:bg-white/[0.04]">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              {uploading ? "Uploading..." : "Click to upload cover image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  try {
                    const url = await uploadCoverImage(file);
                    setValues((v) => ({ ...v, coverImage: url }));
                    toast.success("Cover image uploaded");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Upload failed");
                  } finally {
                    setUploading(false);
                    e.target.value = "";
                  }
                }}
              />
            </label>
          )}

          <Textarea
            placeholder="Short excerpt (shown in the blog list)"
            rows={3}
            value={values.excerpt}
            onChange={(e) => setValues((v) => ({ ...v, excerpt: e.target.value }))}
            className="resize-none"
          />

          <Textarea
            placeholder="Author name (e.g. Nathaniel Onoja)"
            rows={1}
            value={values.author}
            onChange={(e) => setValues((v) => ({ ...v, author: e.target.value }))}
            className="resize-none"
          />

          <Textarea
            placeholder="Write your post content here…"
            rows={10}
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

          <label className="flex cursor-pointer items-center gap-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={values.published}
              onChange={(e) => setValues((v) => ({ ...v, published: e.target.checked }))}
            />
            Publish immediately
          </label>

          <div className="flex gap-3">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || uploading}>
              {saveMutation.isPending ? "Saving…" : editing ? "Update post" : "Publish post"}
            </Button>
            {editing ? (
              <Button variant="outline" onClick={() => { setEditing(null); setValues(emptyPost); }}>Cancel</Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* ── Post list ── */}
      <Card>
        <CardHeader>
          <CardTitle>All posts ({posts.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {posts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No posts yet. Create one above.</p>
          ) : null}
          {posts.map((post) => (
            <div key={post._id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              {post.coverImage ? (
                <Image src={post.coverImage} alt={post.title} width={640} height={320} className="mb-3 h-36 w-full rounded-xl object-cover" unoptimized />
              ) : null}
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium leading-snug text-foreground">{post.title}</p>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${post.published ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.08] text-muted-foreground"}`}>
                  {post.published ? "Published" : "Draft"}
                </span>
              </div>
              {post.excerpt ? <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(post);
                    setValues({
                      title: post.title,
                      excerpt: post.excerpt ?? "",
                      content: post.content,
                      author: post.author ?? "",
                      coverImage: post.coverImage ?? "",
                      published: post.published ?? false,
                    });
                  }}
                >
                  Edit
                </Button>
                {post.published ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
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
          ))}
        </CardContent>
      </Card>
    </div>
  );
}