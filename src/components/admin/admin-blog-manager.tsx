"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileText, ImagePlus, Loader2, Play, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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

function inputClassName(extra = "") {
  return [
    "resize-none rounded-none border-[#c1c8c7] bg-white text-[#1c1b1b]",
    "placeholder:text-[#727878] focus-visible:ring-[#032121]",
    extra,
  ].join(" ");
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

function statusPill(published?: boolean) {
  return published
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-[#c1c8c7] bg-[#f0edec] text-[#414848]";
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
    <section className="space-y-6 text-[#1c1b1b]">
      <div className="border border-[#c1c8c7] bg-[#fcf9f8] p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6f5b3d]">NOJAI Journal</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#032121]">Blog publishing desk</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#414848]">
              Create editorial posts, attach a cover image, add a featured video, and upload multiple gallery images or videos.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
            <div className="border border-[#c1c8c7] bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[#727878]">Posts</p>
              <p className="mt-1 text-xl font-semibold text-[#032121]">{posts.length}</p>
            </div>
            <div className="border border-[#c1c8c7] bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[#727878]">Live</p>
              <p className="mt-1 text-xl font-semibold text-[#032121]">{posts.filter((post) => post.published).length}</p>
            </div>
            <div className="hidden border border-[#c1c8c7] bg-white px-4 py-3 md:block">
              <p className="text-xs uppercase tracking-[0.18em] text-[#727878]">Drafts</p>
              <p className="mt-1 text-xl font-semibold text-[#032121]">{posts.filter((post) => !post.published).length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="border border-[#c1c8c7] bg-white shadow-sm">
          <div className="border-b border-[#c1c8c7] bg-[#f6f3f2] px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6f5b3d]">{editing ? "Editing article" : "New article"}</p>
            <h2 className="mt-1 text-xl font-semibold text-[#032121]">{editing ? editing.title : "Write a new blog post"}</h2>
          </div>

          <div className="space-y-5 p-6">
            <Textarea
              placeholder="Article title"
              rows={2}
              value={values.title}
              onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
              className={inputClassName("text-base font-semibold")}
            />

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                {values.coverImage ? (
                  <div className="relative overflow-hidden border border-[#c1c8c7] bg-[#f0edec]">
                    <Image src={values.coverImage} alt="Cover" width={1000} height={560} className="h-64 w-full object-cover" unoptimized />
                    <button
                      type="button"
                      aria-label="Remove cover image"
                      onClick={() => setValues((v) => ({ ...v, coverImage: "" }))}
                      className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center bg-[#032121] text-white hover:opacity-90"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-64 cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-[#727878] bg-[#f6f3f2] text-sm font-semibold text-[#414848] transition-colors hover:border-[#032121] hover:bg-[#f0edec]">
                    {uploadingCover ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                    {uploadingCover ? "Uploading cover..." : "Upload cover image"}
                    <span className="text-xs font-normal text-[#727878]">Recommended: 16:9 image for the article hero</span>
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
              </div>

              <div className="space-y-4">
                <Textarea
                  placeholder="Short excerpt shown in the blog list"
                  rows={5}
                  value={values.excerpt}
                  onChange={(e) => setValues((v) => ({ ...v, excerpt: e.target.value }))}
                  className={inputClassName("min-h-[132px]")}
                />
                <Textarea
                  placeholder="Author name"
                  rows={1}
                  value={values.author}
                  onChange={(e) => setValues((v) => ({ ...v, author: e.target.value }))}
                  className={inputClassName("min-h-0")}
                />
                <Textarea
                  placeholder="Featured video URL (optional)"
                  rows={1}
                  value={values.featuredVideo}
                  onChange={(e) => setValues((v) => ({ ...v, featuredVideo: e.target.value }))}
                  className={inputClassName("min-h-0")}
                />
              </div>
            </div>

            <div className="border border-[#c1c8c7] bg-[#fcf9f8] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#032121]">Gallery images and videos</p>
                  <p className="text-xs text-[#414848]">Attach multiple screenshots, illustrations, or video clips to the post.</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 border border-[#032121] bg-white px-4 py-2 text-sm font-semibold text-[#032121] hover:bg-[#032121] hover:text-white">
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
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {values.mediaGallery.map((item, index) => (
                    <div key={`${item.url}-${index}`} className="relative overflow-hidden border border-[#c1c8c7] bg-white">
                      {item.kind === "video" ? (
                        <div className="flex aspect-video items-center justify-center bg-[#032121] text-[#cae8e8]">
                          <Play className="h-8 w-8" />
                        </div>
                      ) : (
                        <Image src={item.url} alt={item.name ?? "Gallery image"} width={480} height={270} className="aspect-video w-full object-cover" unoptimized />
                      )}
                      <button
                        type="button"
                        aria-label="Remove media"
                        onClick={() => setValues((v) => ({ ...v, mediaGallery: v.mediaGallery.filter((_, i) => i !== index) }))}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center bg-[#032121] text-white hover:opacity-90"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <p className="truncate px-3 py-2 text-xs font-medium text-[#414848]">{item.name ?? item.kind}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <Textarea
              placeholder="Write your post content here. Markdown headings and saved HTML h2/h3 headings are supported."
              rows={18}
              value={values.content}
              onChange={(e) => setValues((v) => ({ ...v, content: e.target.value }))}
              className={inputClassName("font-mono leading-6")}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#c1c8c7] pt-5">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-none border-[#032121] bg-white text-[#032121] hover:bg-[#f0edec]"
                  onClick={() => setValues((v) => ({ ...v, content: v.content.trim() ? v.content : seoBlogTemplate }))}
                >
                  Insert SEO template
                </Button>
                <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-[#032121]">
                  <input
                    type="checkbox"
                    checked={values.published}
                    onChange={(e) => setValues((v) => ({ ...v, published: e.target.checked }))}
                  />
                  Publish immediately
                </label>
              </div>

              <div className="flex gap-3">
                {editing ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-none border-[#727878] bg-white text-[#414848] hover:bg-[#f0edec]"
                    onClick={() => { setEditing(null); setValues(emptyPost); }}
                  >
                    Cancel
                  </Button>
                ) : null}
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={savingDisabled}
                  className="rounded-none bg-[#032121] text-white shadow-none hover:bg-[#1a3636]"
                >
                  {saveMutation.isPending ? "Saving..." : editing ? "Update post" : "Publish post"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <aside className="border border-[#c1c8c7] bg-[#fcf9f8] shadow-sm">
          <div className="border-b border-[#c1c8c7] bg-[#f6f3f2] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6f5b3d]">Archive</p>
            <h2 className="mt-1 text-lg font-semibold text-[#032121]">All posts ({posts.length})</h2>
          </div>

          <div className="max-h-[calc(100vh-180px)] space-y-4 overflow-y-auto p-4">
            {posts.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#414848]">No posts yet. Create one on the left.</p>
            ) : null}

            {posts.map((post) => {
              const galleryCount = post.mediaGallery?.length ?? 0;
              return (
                <article key={post._id} className="border border-[#c1c8c7] bg-white">
                  {post.coverImage ? (
                    <Image src={post.coverImage} alt={post.title} width={720} height={360} className="h-36 w-full object-cover" unoptimized />
                  ) : (
                    <div className="flex h-24 items-center justify-center bg-[#e5e2e1] text-[#032121]">
                      <FileText className="h-8 w-8" />
                    </div>
                  )}
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold leading-snug text-[#032121]">{post.title}</h3>
                        <p className="mt-1 break-all text-xs text-[#727878]">/{post.slug}</p>
                      </div>
                      <span className={`shrink-0 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusPill(post.published)}`}>
                        {post.published ? "Live" : "Draft"}
                      </span>
                    </div>
                    {post.excerpt ? <p className="line-clamp-2 text-sm leading-6 text-[#414848]">{post.excerpt}</p> : null}
                    <div className="flex flex-wrap gap-2 text-xs font-medium text-[#727878]">
                      {post.featuredVideo ? <span>Featured video</span> : null}
                      {galleryCount > 0 ? <span>{galleryCount} gallery file{galleryCount === 1 ? "" : "s"}</span> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-none border-[#032121] bg-white text-[#032121] hover:bg-[#f0edec]"
                        onClick={() => {
                          setEditing(post);
                          setValues(applyPostToForm(post));
                        }}
                      >
                        Edit
                      </Button>
                      {post.published && post.slug ? (
                        <Button variant="outline" size="sm" asChild className="rounded-none border-[#032121] bg-white text-[#032121] hover:bg-[#f0edec]">
                          <Link href={`/blog/${encodeURIComponent(post.slug)}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                            View live
                          </Link>
                        </Button>
                      ) : null}
                      <Button
                        variant="danger"
                        size="sm"
                        className="rounded-none"
                        onClick={() => deleteMutation.mutate(post._id)}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}
