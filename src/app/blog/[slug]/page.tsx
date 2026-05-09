import type { Metadata } from "next";
import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft, CalendarDays, ImageIcon, Video } from "lucide-react";

import { MarketingShell } from "@/components/layout/marketing-shell";
import { Badge } from "@/components/ui/badge";
import { getBlogPost } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { BlogPost } from "@/types";

interface BlogDetailPageProps {
  params: {
    slug: string;
  };
}

function renderPostContent(content: string) {
  const lines = content.split(/\r?\n/);
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: "ol" | "ul" | null = null;

  const flushList = () => {
    if (!listType || listItems.length === 0) return;
    const Tag = listType;
    nodes.push(
      <Tag key={`list-${nodes.length}`} className="my-6 space-y-2 pl-6 text-base leading-8 text-slate-700 marker:text-primary dark:text-white/75">
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </Tag>,
    );
    listItems = [];
    listType = null;
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      return;
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/);
    const unordered = line.match(/^[-*]\s+(.+)$/);

    if (ordered) {
      if (listType !== "ol") flushList();
      listType = "ol";
      listItems.push(ordered[1]);
      return;
    }

    if (unordered) {
      if (listType !== "ul") flushList();
      listType = "ul";
      listItems.push(unordered[1]);
      return;
    }

    flushList();

    if (line.startsWith("### ")) {
      nodes.push(
        <h3 key={index} className="mt-9 font-display text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
          {line.replace(/^###\s+/, "")}
        </h3>,
      );
      return;
    }

    if (line.startsWith("## ")) {
      nodes.push(
        <h2 key={index} className="mt-12 font-display text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
          {line.replace(/^##\s+/, "")}
        </h2>,
      );
      return;
    }

    nodes.push(
      <p key={index} className="my-5 text-base leading-8 text-slate-700 dark:text-white/75">
        {line}
      </p>,
    );
  });

  flushList();
  return nodes;
}

function mediaItems(post: BlogPost) {
  return (post.mediaGallery ?? []).filter((item) => item?.url);
}

export async function generateMetadata({ params }: BlogDetailPageProps): Promise<Metadata> {
  const post = await getBlogPost(params.slug).catch(() => null);
  if (!post) return { title: "Post not found" };

  return {
    title: post.title,
    description: post.excerpt ?? `Read "${post.title}" on the NOJAI blog.`,
    alternates: { canonical: `/blog/${params.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt ?? `Read "${post.title}" on the NOJAI blog.`,
      url: `/blog/${params.slug}`,
      type: "article",
      ...(post.coverImage ? { images: [{ url: post.coverImage, width: 1400, height: 840, alt: post.title }] } : {}),
    },
  };
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const post = await getBlogPost(params.slug).catch(() => null);

  if (!post) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nojai.io";
  const postUrl = `${siteUrl}/blog/${params.slug}`;
  const gallery = mediaItems(post);
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt ?? `Read "${post.title}" on the NOJAI blog.`,
    datePublished: post.createdAt,
    dateModified: post.createdAt,
    author: {
      "@type": "Person",
      name: post.author ?? "NOJAI Editorial",
    },
    publisher: {
      "@type": "Organization",
      name: "NOJAI",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/logo.jpg`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": postUrl,
    },
    ...(post.coverImage ? { image: [post.coverImage] } : {}),
  };

  return (
    <MarketingShell>
      <article className="mx-auto max-w-5xl px-6 py-12 lg:px-8 lg:py-16">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

        <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-primary dark:text-white/65 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to blog
        </Link>

        <header className="mt-8 max-w-4xl">
          <Badge className="bg-primary/10 text-primary ring-1 ring-primary/20">NOJAI Blog</Badge>
          <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl dark:text-white">
            {post.title}
          </h1>
          {post.excerpt ? <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600 dark:text-white/70">{post.excerpt}</p> : null}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500 dark:text-white/50">
            <span>{post.author ?? "NOJAI Editorial"}</span>
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {formatDate(post.createdAt)}
            </span>
          </div>
        </header>

        {post.coverImage ? (
          <div className="mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <Image src={post.coverImage} alt={post.title} width={1400} height={840} className="h-auto w-full rounded-[1.25rem] object-cover" unoptimized />
          </div>
        ) : null}

        {post.featuredVideo ? (
          <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-2 shadow-sm dark:border-white/10">
            <video src={post.featuredVideo} controls className="w-full rounded-[1.25rem]" />
          </div>
        ) : null}

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="max-w-none">{renderPostContent(post.content ?? "")}</div>
        </div>

        {gallery.length > 0 ? (
          <section className="mt-10">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Media gallery</h2>
              <p className="text-sm text-slate-500 dark:text-white/50">{gallery.length} file{gallery.length === 1 ? "" : "s"}</p>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {gallery.map((item, index) => (
                <div key={`${item.url}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                  {item.kind === "video" ? (
                    <video src={item.url} controls className="aspect-video w-full rounded-xl bg-slate-950 object-cover" />
                  ) : (
                    <Image src={item.url} alt={item.name ?? `${post.title} media ${index + 1}`} width={900} height={540} className="aspect-video w-full rounded-xl object-cover" unoptimized />
                  )}
                  <div className="flex items-center gap-2 px-2 py-3 text-sm font-medium text-slate-600 dark:text-white/65">
                    {item.kind === "video" ? <Video className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                    {item.name ?? (item.kind === "video" ? "Video" : "Image")}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </MarketingShell>
  );
}
