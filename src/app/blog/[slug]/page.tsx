import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";

import { MarketingShell } from "@/components/layout/marketing-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBlogPost } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface BlogDetailPageProps {
  params: {
    slug: string;
  };
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
  const post = await getBlogPost(params.slug);

  if (!post) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nojai.io";
  const postUrl = `${siteUrl}/blog/${params.slug}`;
    const articleJsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: (post.excerpt ?? `Read \"${post.title}\" on the NOJAI blog.`) + " Need help to start trading? Learn about trading bots, how to become a profitable trader, and how to copy trade expert traders.",
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
      mainEntity: [
        {
          "@type": "Question",
          name: "Need help to start trading?",
          acceptedAnswer: { "@type": "Answer", text: "NOJAI makes it easy for beginners. Connect your broker, set your amount, and let the bot trade for you automatically." }
        },
        {
          "@type": "Question",
          name: "How to become a profitable trader?",
          acceptedAnswer: { "@type": "Answer", text: "Use automation, risk management, and copy trading features to improve your results. NOJAI helps you learn and earn at the same time." }
        },
        {
          "@type": "Question",
          name: "How to copy trade expert traders?",
          acceptedAnswer: { "@type": "Answer", text: "With NOJAI Pro and VIP plans, you can copy trades from top strategies and automate your trading 24/7." }
        },
        {
          "@type": "Question",
          name: "What is a trading bot?",
          acceptedAnswer: { "@type": "Answer", text: "A trading bot is software that executes trades for you based on your chosen strategy. NOJAI handles everything from signals to execution." }
        },
        {
          "@type": "Question",
          name: "Need help?",
          acceptedAnswer: { "@type": "Answer", text: "Our support team is available 24/7. Contact us anytime for setup or trading questions." }
        },
      ],
      ...(post.coverImage ? { image: [post.coverImage] } : {}),
    };

  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />
        <Badge>Blog</Badge>
        <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight">{post.title}</h1>
        <p className="mt-4 text-sm text-muted-foreground">{formatDate(post.createdAt)}</p>
        {post.coverImage ? (
          <div className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 p-3">
            <Image src={post.coverImage} alt={post.title} width={1400} height={840} className="h-auto w-full rounded-[1.5rem] object-cover" unoptimized />
          </div>
        ) : null}
        {post.featuredVideo ? (
          <div className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 p-3">
            <video src={post.featuredVideo} controls className="w-full rounded-[1.5rem]" />
          </div>
        ) : null}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>{post.excerpt ?? "NOJAI editorial"}</CardTitle>
          </CardHeader>
          <CardContent>
            <article
              className="prose prose-invert max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </CardContent>
        </Card>
      </section>
    </MarketingShell>
  );
}