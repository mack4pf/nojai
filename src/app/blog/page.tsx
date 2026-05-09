import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";

import { ArrowRight, BookOpen, Search, Star } from "lucide-react";
import { getServerSession } from "next-auth";

import { MarketingShell } from "@/components/layout/marketing-shell";
import { authOptions } from "@/lib/auth";
import { getBlogPosts, getCourses, getPublicReviews } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: "NOJAI Journal - Trading Insights & Platform Updates",
  description:
    "Read trading automation guides, broker setup tutorials, product updates, and strategy playbooks from the NOJAI team.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "NOJAI Journal - Trading Insights & Platform Updates",
    description: "Read trading automation guides, broker setup tutorials, product updates, and strategy playbooks from the NOJAI team.",
    url: "/blog",
  },
};

function postExcerpt(content?: string, excerpt?: string) {
  if (excerpt?.trim()) return excerpt;
  const stripped = (content ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/[#*_>`-]/g, "")
    .trim();
  return stripped.length > 170 ? `${stripped.slice(0, 170)}...` : stripped;
}

function readingTime(content?: string) {
  const words = (content ?? "").replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

function articleSection(postTitle: string) {
  const normalized = postTitle.toLowerCase();
  if (normalized.includes("expert")) return "ExpertOption";
  if (normalized.includes("iq option") || normalized.includes("iq")) return "IQ Option";
  if (normalized.includes("ai")) return "Automation";
  return "Trading Strategy";
}

export default async function BlogPage() {
  const [posts, reviews, courses, session] = await Promise.all([
    getBlogPosts().catch(() => []),
    getPublicReviews().catch(() => []),
    getCourses().catch(() => []),
    getServerSession(authOptions).catch(() => null),
  ]);

  const [featuredPost, ...otherPosts] = posts;
  const sidebarPosts = posts.slice(0, 3);

  return (
    <MarketingShell>
      <div className="bg-[#fcf9f8] text-[#1c1b1b] dark:bg-[#131818] dark:text-[#f3f0ef]">
        <section className="mx-auto max-w-[1200px] px-5 py-12 md:px-8 lg:py-16">
          <div className="mb-12 border-b border-[#c1c8c7] pb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6f5b3d]">NOJAI Journal</p>
            <h1 className={`${playfair.className} mt-3 max-w-4xl text-4xl font-bold leading-tight tracking-tight text-[#032121] md:text-6xl dark:text-[#cae8e8]`}>
              Trading automation, broker setup, and smarter bot strategy
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#414848] dark:text-[#d7dddd]">
              Long-form guides for users who want to understand what the bot is doing, how to connect accounts, and how to manage risk with confidence.
            </p>
          </div>

          {featuredPost ? (
            <article className="grid items-center gap-8 lg:grid-cols-12">
              <Link href={`/blog/${encodeURIComponent(featuredPost.slug)}`} className="group block overflow-hidden bg-[#e5e2e1] lg:col-span-8">
                {featuredPost.coverImage ? (
                  <Image
                    src={featuredPost.coverImage}
                    alt={featuredPost.title}
                    width={1280}
                    height={720}
                    className="aspect-video w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    unoptimized
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-[#032121] text-[#cae8e8]">
                    <BookOpen className="h-14 w-14" />
                  </div>
                )}
              </Link>
              <div className="lg:col-span-4">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6f5b3d]">{articleSection(featuredPost.title)}</p>
                <Link href={`/blog/${encodeURIComponent(featuredPost.slug)}`} className="group mt-4 block">
                  <h2 className={`${playfair.className} text-4xl font-bold leading-tight text-[#032121] transition-colors group-hover:text-[#6f5b3d] dark:text-[#cae8e8]`}>
                    {featuredPost.title}
                  </h2>
                </Link>
                <p className="mt-4 text-lg leading-8 text-[#414848] dark:text-[#d7dddd]">{postExcerpt(featuredPost.content, featuredPost.excerpt)}</p>
                <div className="mt-6 border-y border-[#c1c8c7] py-4 text-sm text-[#414848] dark:border-white/15 dark:text-[#d7dddd]">
                  <span className="font-semibold">{featuredPost.author ?? "NOJAI Editorial"}</span>
                  <span className="mx-2">/</span>
                  <span>{formatDate(featuredPost.createdAt)}</span>
                  <span className="mx-2">/</span>
                  <span>{readingTime(featuredPost.content)}</span>
                </div>
              </div>
            </article>
          ) : (
            <div className="border border-[#c1c8c7] bg-white p-8 text-[#414848] dark:border-white/15 dark:bg-white/[0.04] dark:text-[#d7dddd]">
              No posts yet. Check back soon.
            </div>
          )}
        </section>

        <section className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 pb-16 md:px-8 lg:flex-row">
          <div className="flex-1">
            <div className="mb-8 flex items-center justify-between border-b-2 border-[#032121] pb-2 dark:border-[#cae8e8]">
              <h2 className={`${playfair.className} text-2xl font-semibold text-[#032121] dark:text-[#cae8e8]`}>Latest Dispatches</h2>
              <Link href="/blog" className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f5b3d]">View all</Link>
            </div>

            {otherPosts.length === 0 ? (
              <p className="text-sm text-[#414848] dark:text-[#d7dddd]">{featuredPost ? "More posts are coming soon." : "No posts yet. Check back soon."}</p>
            ) : (
              <div className="grid gap-x-8 gap-y-12 md:grid-cols-2">
                {otherPosts.map((post) => (
                  <article key={post._id} className="group">
                    <Link href={`/blog/${encodeURIComponent(post.slug)}`} className="block overflow-hidden bg-[#e5e2e1]">
                      {post.coverImage ? (
                        <Image
                          src={post.coverImage}
                          alt={post.title}
                          width={900}
                          height={600}
                          className="aspect-[3/2] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          unoptimized
                        />
                      ) : (
                        <div className="flex aspect-[3/2] items-center justify-center bg-[#032121] text-[#cae8e8]">
                          <BookOpen className="h-10 w-10" />
                        </div>
                      )}
                    </Link>
                    <div className="mt-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6f5b3d]">{articleSection(post.title)}</p>
                      <Link href={`/blog/${encodeURIComponent(post.slug)}`} className="group/title mt-2 block">
                        <h3 className={`${playfair.className} text-2xl font-semibold leading-snug text-[#032121] transition-colors group-hover/title:text-[#6f5b3d] dark:text-[#cae8e8]`}>
                          {post.title}
                        </h3>
                      </Link>
                      <p className="mt-3 line-clamp-3 text-base leading-7 text-[#414848] dark:text-[#d7dddd]">{postExcerpt(post.content, post.excerpt)}</p>
                      <p className="mt-3 text-sm text-[#727878] dark:text-[#b9c3c3]">{formatDate(post.createdAt)} / {readingTime(post.content)}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {courses.length > 0 ? (
              <div className="mt-16 border-t-2 border-[#032121] pt-8 dark:border-[#cae8e8]">
                <h2 className={`${playfair.className} text-3xl font-semibold text-[#032121] dark:text-[#cae8e8]`}>Learn the strategies behind the signals</h2>
                <div className="mt-8 space-y-8">
                  {courses.slice(0, 3).map((course) => {
                    if (!course._id) return null;
                    const courseHref = session
                      ? `/dashboard/courses/${course._id}`
                      : `/auth/register?callbackUrl=/dashboard/courses/${course._id}`;
                    return (
                      <Link key={course._id} href={courseHref} className="group flex flex-col gap-6 border-b border-[#c1c8c7] pb-8 md:flex-row dark:border-white/15">
                        {course.coverImage ? (
                          <Image src={course.coverImage} alt={course.title} width={320} height={220} className="aspect-[4/3] w-full object-cover md:w-56" unoptimized />
                        ) : null}
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f5b3d]">
                            {course.accessType === "paid" ? `Paid / ${formatCurrency(course.price ?? 0, course.currency ?? "USD")}` : "Free course"}
                          </p>
                          <h3 className={`${playfair.className} mt-2 text-2xl font-semibold text-[#032121] group-hover:text-[#6f5b3d] dark:text-[#cae8e8]`}>{course.title}</h3>
                          {course.description ? <p className="mt-2 line-clamp-2 text-[#414848] dark:text-[#d7dddd]">{course.description}</p> : null}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="flex flex-col gap-10 lg:w-[300px]">
            <section>
              <div className="h-[2px] bg-[#032121] dark:bg-[#cae8e8]" />
              <h3 className="mt-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#032121] dark:text-[#cae8e8]">Search</h3>
              <div className="relative mt-4">
                <input className="w-full border-0 border-b border-[#c1c8c7] bg-transparent px-0 py-3 pr-9 text-[#1c1b1b] placeholder:text-[#727878] focus:border-[#032121] focus:ring-0 dark:text-white dark:focus:border-[#cae8e8]" placeholder="Keywords..." />
                <Search className="absolute right-0 top-3.5 h-5 w-5 text-[#727878]" />
              </div>
            </section>

            <section>
              <div className="h-[2px] bg-[#032121] dark:bg-[#cae8e8]" />
              <h3 className="mt-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#032121] dark:text-[#cae8e8]">Sections</h3>
              <ul className="mt-4 space-y-3 text-[#414848] dark:text-[#d7dddd]">
                {["IQ Option", "ExpertOption", "AI Trading", "Copy Trading", "Risk Management"].map((section) => (
                  <li key={section} className="flex items-center justify-between border-b border-[#e5e2e1] pb-2 dark:border-white/10">
                    <span>{section}</span>
                    <span className="text-sm text-[#727878]">({posts.filter((post) => articleSection(post.title) === section || post.title.toLowerCase().includes(section.toLowerCase().split(" ")[0])).length})</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <div className="h-[2px] bg-[#032121] dark:bg-[#cae8e8]" />
              <h3 className="mt-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#032121] dark:text-[#cae8e8]">Popular Posts</h3>
              <div className="mt-5 space-y-6">
                {sidebarPosts.map((post, index) => (
                  <Link key={post._id} href={`/blog/${encodeURIComponent(post.slug)}`} className="group flex gap-3">
                    <span className={`${playfair.className} text-4xl leading-none text-[#032121]/20 dark:text-[#cae8e8]/30`}>{String(index + 1).padStart(2, "0")}</span>
                    <span>
                      <span className="block text-sm font-semibold leading-tight text-[#032121] transition-colors group-hover:text-[#6f5b3d] dark:text-[#cae8e8]">{post.title}</span>
                      <span className="mt-1 block text-sm text-[#727878]">{readingTime(post.content)}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="border border-[#c1c8c7] bg-[#f0edec] p-6 dark:border-white/15 dark:bg-white/[0.05]">
              <h3 className={`${playfair.className} text-xl font-semibold text-[#032121] dark:text-[#cae8e8]`}>The NOJAI Dispatch</h3>
              <p className="mt-3 text-sm leading-6 text-[#414848] dark:text-[#d7dddd]">Setup guides, bot updates, and trading automation notes from the team.</p>
              <Link href="/auth/register" className="mt-5 inline-flex w-full items-center justify-center gap-2 bg-[#032121] px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90">
                Start now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </section>
          </aside>
        </section>

        {reviews.length > 0 ? (
          <section className="border-t border-[#c1c8c7] bg-[#f0edec] dark:border-white/10 dark:bg-white/[0.03]">
            <div className="mx-auto max-w-[1200px] px-5 py-12 md:px-8">
              <h2 className={`${playfair.className} text-3xl font-semibold text-[#032121] dark:text-[#cae8e8]`}>What NOJAI users are saying</h2>
              <div className="mt-8 grid gap-6 md:grid-cols-3">
                {reviews.slice(0, 3).map((review) => (
                  <div key={review._id} className="border border-[#c1c8c7] bg-[#fcf9f8] p-5 dark:border-white/15 dark:bg-[#131818]">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < (review.rating ?? 0) ? "fill-[#6f5b3d] text-[#6f5b3d]" : "text-[#c1c8c7]"}`} />
                      ))}
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[#414848] dark:text-[#d7dddd]">{review.comment}</p>
                    <p className="mt-4 text-sm font-semibold text-[#032121] dark:text-[#cae8e8]">{review.user?.name ?? "Verified user"}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </MarketingShell>
  );
}
