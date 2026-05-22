import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft, BookOpen, ImageIcon, Mail, Share2, Video } from "lucide-react";

import { BlogEditorialShell } from "@/components/blog/blog-editorial-shell";
import { getBlogPost, getBlogPosts } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { BlogPost } from "@/types";

interface BlogDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "").trim();
}

function readingTime(content?: string) {
  const words = stripHtml(content ?? "").split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

function articleSection(postTitle: string) {
  const normalized = postTitle.toLowerCase();
  if (normalized.includes("expert")) return "ExpertOption";
  if (normalized.includes("iq option") || normalized.includes("iq")) return "IQ Option";
  if (normalized.includes("ai")) return "Automation";
  return "Trading Strategy";
}

/**
 * Converts markdown + HTML mixed content into a sanitised HTML string
 * so we can render it with dangerouslySetInnerHTML inside .blog-content.
 * All links get target="_blank" rel="noopener noreferrer".
 * Video URLs (YouTube, Instagram, TikTok, Telegram) become embeds / cards.
 */
function contentToHtml(content: string): string {
  const processInline = (text: string): string => {
    return (
      text
        // Keep existing <a> but ensure they open in new tab
        .replace(/<a\s+(?![^>]*target=)/gi, '<a target="_blank" rel="noopener noreferrer" ')
        // Markdown links [text](url)
        .replace(
          /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
          '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
        )
        // Bold **text**
        .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
        // Italic _text_ (not already in a tag)
        .replace(/(?<![a-zA-Z])_([^_\n]+)_(?![a-zA-Z])/g, "<em>$1</em>")
        // Raw URLs not already inside an href attribute
        .replace(
          /(?<!href=["'])(https?:\/\/[^\s<>"')\]]+)/g,
          '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
        )
    );
  };

  const videoEmbed = (url: string): string | null => {
    const yt = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    );
    if (yt)
      return `<div class="blog-video-embed"><iframe src="https://www.youtube.com/embed/${yt[1]}" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;

    const ig = url.match(
      /instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/,
    );
    if (ig)
      return `<div class="blog-video-embed blog-video-embed--ig"><iframe src="https://www.instagram.com/p/${ig[1]}/embed/" scrolling="no" allowtransparency="true"></iframe></div>`;

    if (/tiktok\.com\//.test(url))
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="blog-platform-card"><span class="blog-platform-card__icon">🎵</span><div><strong>Watch on TikTok</strong><p style="margin:0;font-size:0.85rem;opacity:0.65">${url}</p></div></a>`;

    if (/t\.me\//.test(url))
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="blog-platform-card"><span class="blog-platform-card__icon">✈️</span><div><strong>View on Telegram</strong><p style="margin:0;font-size:0.85rem;opacity:0.65">${url}</p></div></a>`;

    return null;
  };

  const lines = content.split(/\r?\n/);
  let html = "";
  let inUl = false;
  let inOl = false;

  const closeList = () => {
    if (inUl) { html += "</ul>\n"; inUl = false; }
    if (inOl) { html += "</ol>\n"; inOl = false; }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) { closeList(); continue; }

    // Pass-through HTML block elements (already valid HTML)
    if (/^<(h[1-6]|p|div|section|article|blockquote|ul|ol|li|figure|table|pre|hr)\b/i.test(line)) {
      closeList();
      html += processInline(line) + "\n";
      continue;
    }

    // Markdown headings
    if (line.startsWith("### ")) { closeList(); html += `<h3>${processInline(line.slice(4))}</h3>\n`; continue; }
    if (line.startsWith("## "))  { closeList(); html += `<h2>${processInline(line.slice(3))}</h2>\n`; continue; }
    if (line.startsWith("# "))   { closeList(); html += `<h1>${processInline(line.slice(2))}</h1>\n`; continue; }

    // Horizontal rule
    if (/^---+$/.test(line)) { closeList(); html += "<hr />\n"; continue; }

    // Blockquote
    if (line.startsWith("> ")) { closeList(); html += `<blockquote>${processInline(line.slice(2))}</blockquote>\n`; continue; }

    // Ordered list
    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (!inOl) { closeList(); html += "<ol>\n"; inOl = true; }
      html += `<li>${processInline(olMatch[1])}</li>\n`;
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (!inUl) { closeList(); html += "<ul>\n"; inUl = true; }
      html += `<li>${processInline(ulMatch[1])}</li>\n`;
      continue;
    }

    closeList();

    // Bare video URL → embed
    const bareUrl = line.match(/^(https?:\/\/\S+)$/);
    if (bareUrl) {
      const embed = videoEmbed(bareUrl[1]);
      if (embed) { html += embed + "\n"; continue; }
    }

    // Normal paragraph
    html += `<p>${processInline(line)}</p>\n`;
  }

  closeList();
  return html;
}

/** Render the featured video field — detects YouTube, Instagram, TikTok, Telegram or falls back to <video> */
function renderFeaturedVideo(url: string) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) {
    return (
      <div className="mb-12 aspect-video w-full overflow-hidden rounded-xl border border-border">
        <iframe
          src={`https://www.youtube.com/embed/${yt[1]}`}
          title="Featured video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  const ig = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  if (ig) {
    return (
      <div className="mb-12 overflow-hidden rounded-xl border border-border" style={{ minHeight: 520 }}>
        <iframe
          src={`https://www.instagram.com/p/${ig[1]}/embed/`}
          className="w-full"
          style={{ minHeight: 520, border: "none" }}
          scrolling="no"
        />
      </div>
    );
  }

  if (/tiktok\.com\//.test(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="mb-12 flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted">
        <span className="text-3xl">🎵</span>
        <div>
          <p className="font-semibold text-foreground">Watch on TikTok</p>
          <p className="mt-1 break-all text-sm text-muted-foreground">{url}</p>
        </div>
      </a>
    );
  }

  if (/t\.me\//.test(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="mb-12 flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted">
        <span className="text-3xl">✈️</span>
        <div>
          <p className="font-semibold text-foreground">View on Telegram</p>
          <p className="mt-1 break-all text-sm text-muted-foreground">{url}</p>
        </div>
      </a>
    );
  }

  return (
    <div className="mb-12 overflow-hidden rounded-xl border border-border bg-card p-2">
      <video src={url} controls className="w-full rounded-lg" />
    </div>
  );
}

function mediaItems(post: BlogPost) {
  return (post.mediaGallery ?? []).filter((item) => item?.url);
}

export async function generateMetadata({ params }: BlogDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug).catch(() => null);
  if (!post) return { title: "Post not found" };

  return {
    title: post.title,
    description: post.excerpt ?? `Read "${post.title}" on the NOJAI blog.`,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt ?? `Read "${post.title}" on the NOJAI blog.`,
      url: `/blog/${slug}`,
      type: "article",
      ...(post.coverImage ? { images: [{ url: post.coverImage, width: 1400, height: 840, alt: post.title }] } : {}),
    },
  };
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { slug } = await params;
  const [post, posts] = await Promise.all([
    getBlogPost(slug).catch(() => null),
    getBlogPosts().catch(() => []),
  ]);

  if (!post) notFound();

  const relatedPosts = posts.filter((item) => item.slug !== post.slug).slice(0, 2);
  const gallery = mediaItems(post);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nojai.io";
  const postUrl = `${siteUrl}/blog/${slug}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt ?? `Read "${post.title}" on the NOJAI blog.`,
    datePublished: post.publishedAt ?? post.createdAt,
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
    <BlogEditorialShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

      <main className="mx-auto max-w-[1200px] px-5 py-12 md:px-8 md:py-20">
        <div className="flex flex-col gap-12 lg:flex-row">
          <article className="flex-1">
            <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              <Link href="/" className="hover:text-foreground">Home</Link>
              <span>/</span>
              <Link href="/blog" className="hover:text-foreground">Blog</Link>
              <span>/</span>
              <span className="text-muted-foreground">{articleSection(post.title)}</span>
            </nav>

            <header className="mb-12">
              <h1 className="mb-6 max-w-4xl font-display text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl">
                {post.title}
              </h1>
              {post.excerpt ? <p className="mb-6 max-w-3xl text-xl leading-9 text-muted-foreground">{post.excerpt}</p> : null}
              <div className="flex items-center gap-4 border-y border-border py-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground">By {post.author ?? "NOJAI Editorial"}</p>
                  <p className="mt-1 text-sm italic text-muted-foreground">{formatDate(post.publishedAt ?? post.createdAt)} / {readingTime(post.content)}</p>
                </div>
                {/* Social share */}
                <div className="ml-auto flex items-center gap-3">
                  <span className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:block">Share</span>
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(post.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Share on X / Twitter"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Share on Facebook"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <Share2 className="h-4 w-4" />
                  </a>
                  <a
                    href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(postUrl)}&title=${encodeURIComponent(post.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Share on LinkedIn"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <Share2 className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </header>

            {post.coverImage ? (
              <figure className="mb-12">
                <Image src={post.coverImage} alt={post.title} width={1400} height={840} className="aspect-video w-full object-cover" unoptimized />
                <figcaption className="mt-3 text-center text-sm italic text-muted-foreground">
                  {post.title}
                </figcaption>
              </figure>
            ) : null}

            {post.featuredVideo ? renderFeaturedVideo(post.featuredVideo) : null}

            <div
              className="blog-content mx-auto max-w-[720px]"
              dangerouslySetInnerHTML={{ __html: contentToHtml(post.content ?? "") }}
            />

            {gallery.length > 0 ? (
              <section className="mt-16">
                <div className="mb-6 flex items-center gap-4">
                  <h2 className="font-display text-3xl font-semibold text-foreground">Media Gallery</h2>
                  <div className="h-[2px] flex-1 bg-primary" />
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  {gallery.map((item, index) => (
                    <div key={`${item.url}-${index}`} className="border border-border bg-card p-2">
                      {item.kind === "video" ? (
                        <video src={item.url} controls className="aspect-video w-full bg-background object-cover" />
                      ) : (
                        <Image src={item.url} alt={item.name ?? `${post.title} media ${index + 1}`} width={900} height={540} className="aspect-video w-full object-cover" unoptimized />
                      )}
                      <div className="flex items-center gap-2 px-2 py-3 text-sm font-medium text-muted-foreground">
                        {item.kind === "video" ? <Video className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                        {item.name ?? (item.kind === "video" ? "Video" : "Image")}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <Link href="/blog" className="mt-14 inline-flex items-center gap-2 border border-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-primary hover:text-primary-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to journal
            </Link>
          </article>

          <aside className="space-y-12 lg:w-[300px]">
            {relatedPosts.length > 0 ? (
              <section className="border-t-2 border-primary pt-6">
                <h3 className="mb-6 text-sm font-semibold uppercase tracking-[0.24em] text-foreground">Related Posts</h3>
                <div className="space-y-8">
                  {relatedPosts.map((related) => (
                    <Link key={related._id} href={`/blog/${encodeURIComponent(related.slug)}`} className="group block">
                      {related.coverImage ? (
                        <Image src={related.coverImage} alt={related.title} width={420} height={280} className="mb-3 aspect-[3/2] w-full object-cover grayscale transition-all duration-300 group-hover:grayscale-0" unoptimized />
                      ) : null}
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.22em] text-primary">{articleSection(related.title)}</span>
                      <h4 className="font-display text-xl font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                        {related.title}
                      </h4>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="border border-border bg-card p-6">
              <div className="mb-4 h-[2px] w-12 bg-primary" />
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-foreground">The Dispatch</h3>
              <p className="mb-6 text-sm leading-6 text-muted-foreground">
                Get NOJAI setup guides, bot updates, and risk notes from the team.
              </p>
              <Link href="/auth/register" className="inline-flex w-full items-center justify-center gap-2 bg-primary px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground transition-opacity hover:opacity-90">
                <Mail className="h-4 w-4" />
                Start now
              </Link>
            </section>

            <div className="sticky top-28 border-t-2 border-primary pt-6">
              <div className="flex aspect-square flex-col items-center justify-center bg-muted p-8 text-center">
                <BookOpen className="mb-4 h-10 w-10 text-primary" />
                <h3 className="mb-2 font-display text-xl font-semibold text-foreground">Ready to automate?</h3>
                <p className="mb-4 text-sm leading-6 text-muted-foreground">Connect IQ Option or ExpertOption and let NOJAI handle execution.</p>
                <Link href="/auth/register" className="text-sm font-semibold uppercase tracking-[0.18em] text-primary underline hover:no-underline">Create account</Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </BlogEditorialShell>
  );
}
