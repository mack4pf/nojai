import type { Metadata } from "next";
import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import { notFound } from "next/navigation";

import { ArrowLeft, BookOpen, ImageIcon, Mail, Video } from "lucide-react";

import { MarketingShell } from "@/components/layout/marketing-shell";
import { getBlogPost, getBlogPosts } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { BlogPost } from "@/types";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });

interface BlogDetailPageProps {
  params: {
    slug: string;
  };
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

function renderPostContent(content: string) {
  const lines = content.split(/\r?\n/);
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: "ol" | "ul" | null = null;

  const flushList = () => {
    if (!listType || listItems.length === 0) return;
    const Tag = listType;
    nodes.push(
      <Tag key={`list-${nodes.length}`} className="space-y-3 pl-6 text-lg leading-8 text-[#1c1b1b] marker:text-[#6f5b3d] dark:text-[#f3f0ef]">
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`}>{stripHtml(item)}</li>
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

    const htmlHeading = line.match(/^<h([23])[^>]*>(.*?)<\/h\1>$/i);
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

    if (htmlHeading?.[1] === "2" || line.startsWith("## ")) {
      const text = htmlHeading ? htmlHeading[2] : line.replace(/^##\s+/, "");
      nodes.push(
        <h2 key={index} className={`${playfair.className} mt-12 text-3xl font-semibold leading-snug text-[#032121] dark:text-[#cae8e8]`}>
          {stripHtml(text)}
        </h2>,
      );
      return;
    }

    if (htmlHeading?.[1] === "3" || line.startsWith("### ")) {
      const text = htmlHeading ? htmlHeading[2] : line.replace(/^###\s+/, "");
      nodes.push(
        <h3 key={index} className={`${playfair.className} mt-10 text-2xl font-semibold leading-snug text-[#1c1b1b] dark:text-white`}>
          {stripHtml(text)}
        </h3>,
      );
      return;
    }

    if (/^<blockquote/i.test(line)) {
      nodes.push(
        <blockquote key={index} className="border-l-4 border-[#f6dcb5] bg-[#f6f3f2] px-8 py-6 text-xl italic leading-9 text-[#032121] dark:bg-white/[0.06] dark:text-[#cae8e8]">
          {stripHtml(line)}
        </blockquote>,
      );
      return;
    }

    nodes.push(
      <p key={index} className="text-lg leading-9 text-[#1c1b1b] dark:text-[#f3f0ef]">
        {stripHtml(line)}
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
  const [post, posts] = await Promise.all([
    getBlogPost(params.slug).catch(() => null),
    getBlogPosts().catch(() => []),
  ]);

  if (!post) notFound();

  const relatedPosts = posts.filter((item) => item.slug !== post.slug).slice(0, 2);
  const gallery = mediaItems(post);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nojai.io";
  const postUrl = `${siteUrl}/blog/${params.slug}`;
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
    <MarketingShell>
      <div className="bg-[#fcf9f8] text-[#1c1b1b] dark:bg-[#131818] dark:text-[#f3f0ef]">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

        <main className="mx-auto max-w-[1200px] px-5 py-12 md:px-8 lg:py-16">
          <div className="flex flex-col gap-12 lg:flex-row">
            <article className="flex-1">
              <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#6f5b3d]">
                <Link href="/" className="hover:text-[#032121] dark:hover:text-[#cae8e8]">Home</Link>
                <span>/</span>
                <Link href="/blog" className="hover:text-[#032121] dark:hover:text-[#cae8e8]">Blog</Link>
                <span>/</span>
                <span className="text-[#414848] dark:text-[#d7dddd]">{articleSection(post.title)}</span>
              </nav>

              <header className="mb-12">
                <h1 className={`${playfair.className} mb-6 max-w-4xl text-4xl font-bold leading-tight tracking-tight text-[#032121] md:text-6xl dark:text-[#cae8e8]`}>
                  {post.title}
                </h1>
                {post.excerpt ? <p className="mb-6 max-w-3xl text-xl leading-9 text-[#414848] dark:text-[#d7dddd]">{post.excerpt}</p> : null}
                <div className="flex items-center gap-4 border-y border-[#c1c8c7] py-6 dark:border-white/15">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#032121] text-[#cae8e8]">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#032121] dark:text-[#cae8e8]">By {post.author ?? "NOJAI Editorial"}</p>
                    <p className="mt-1 text-sm italic text-[#414848] dark:text-[#d7dddd]">{formatDate(post.publishedAt ?? post.createdAt)} / {readingTime(post.content)}</p>
                  </div>
                </div>
              </header>

              {post.coverImage ? (
                <figure className="mb-12">
                  <Image src={post.coverImage} alt={post.title} width={1400} height={840} className="aspect-video w-full object-cover" unoptimized />
                  <figcaption className="mt-3 text-center text-sm italic text-[#414848] dark:text-[#d7dddd]">
                    {post.title}
                  </figcaption>
                </figure>
              ) : null}

              {post.featuredVideo ? (
                <div className="mb-12 bg-[#032121] p-2">
                  <video src={post.featuredVideo} controls className="w-full" />
                </div>
              ) : null}

              <div className="mx-auto max-w-[720px] space-y-8">
                {renderPostContent(post.content ?? "")}
              </div>

              {gallery.length > 0 ? (
                <section className="mt-16">
                  <div className="mb-6 flex items-center gap-4">
                    <h2 className={`${playfair.className} text-3xl font-semibold text-[#032121] dark:text-[#cae8e8]`}>Media Gallery</h2>
                    <div className="h-[2px] flex-1 bg-[#032121] dark:bg-[#cae8e8]" />
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    {gallery.map((item, index) => (
                      <div key={`${item.url}-${index}`} className="border border-[#c1c8c7] bg-[#f6f3f2] p-2 dark:border-white/15 dark:bg-white/[0.05]">
                        {item.kind === "video" ? (
                          <video src={item.url} controls className="aspect-video w-full bg-[#032121] object-cover" />
                        ) : (
                          <Image src={item.url} alt={item.name ?? `${post.title} media ${index + 1}`} width={900} height={540} className="aspect-video w-full object-cover" unoptimized />
                        )}
                        <div className="flex items-center gap-2 px-2 py-3 text-sm font-medium text-[#414848] dark:text-[#d7dddd]">
                          {item.kind === "video" ? <Video className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                          {item.name ?? (item.kind === "video" ? "Video" : "Image")}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <Link href="/blog" className="mt-14 inline-flex items-center gap-2 border border-[#032121] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#032121] transition-colors hover:bg-[#032121] hover:text-white dark:border-[#cae8e8] dark:text-[#cae8e8] dark:hover:bg-[#cae8e8] dark:hover:text-[#032121]">
                <ArrowLeft className="h-4 w-4" />
                Back to journal
              </Link>
            </article>

            <aside className="space-y-12 lg:w-[300px]">
              {relatedPosts.length > 0 ? (
                <section className="border-t-2 border-[#032121] pt-6 dark:border-[#cae8e8]">
                  <h3 className="mb-6 text-sm font-semibold uppercase tracking-[0.24em] text-[#032121] dark:text-[#cae8e8]">Related Posts</h3>
                  <div className="space-y-8">
                    {relatedPosts.map((related) => (
                      <Link key={related._id} href={`/blog/${encodeURIComponent(related.slug)}`} className="group block">
                        {related.coverImage ? (
                          <Image src={related.coverImage} alt={related.title} width={420} height={280} className="mb-3 aspect-[3/2] w-full object-cover grayscale transition-all duration-300 group-hover:grayscale-0" unoptimized />
                        ) : null}
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.22em] text-[#6f5b3d]">{articleSection(related.title)}</span>
                        <h4 className={`${playfair.className} text-xl font-semibold leading-snug text-[#032121] transition-colors group-hover:text-[#6f5b3d] dark:text-[#cae8e8]`}>
                          {related.title}
                        </h4>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="border border-[#c1c8c7] bg-[#f0edec] p-6 dark:border-white/15 dark:bg-white/[0.05]">
                <div className="mb-4 h-[2px] w-12 bg-[#032121] dark:bg-[#cae8e8]" />
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#032121] dark:text-[#cae8e8]">The Dispatch</h3>
                <p className="mb-6 text-sm leading-6 text-[#414848] dark:text-[#d7dddd]">
                  Get NOJAI setup guides, bot updates, and risk notes from the team.
                </p>
                <Link href="/auth/register" className="inline-flex w-full items-center justify-center gap-2 bg-[#032121] px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90">
                  <Mail className="h-4 w-4" />
                  Start now
                </Link>
              </section>

              <div className="sticky top-28 border-t-2 border-[#032121] pt-6 dark:border-[#cae8e8]">
                <div className="flex aspect-square flex-col items-center justify-center bg-[#e5e2e1] p-8 text-center dark:bg-white/[0.06]">
                  <BookOpen className="mb-4 h-10 w-10 text-[#032121] dark:text-[#cae8e8]" />
                  <h3 className={`${playfair.className} mb-2 text-xl font-semibold text-[#032121] dark:text-[#cae8e8]`}>Ready to automate?</h3>
                  <p className="mb-4 text-sm leading-6 text-[#414848] dark:text-[#d7dddd]">Connect IQ Option or ExpertOption and let NOJAI handle execution.</p>
                  <Link href="/auth/register" className="text-sm font-semibold uppercase tracking-[0.18em] text-[#032121] underline hover:no-underline dark:text-[#cae8e8]">Create account</Link>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </MarketingShell>
  );
}
