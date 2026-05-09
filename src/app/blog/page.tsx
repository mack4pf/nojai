import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";

import { ArrowRight, BookOpen, Search } from "lucide-react";
import { getServerSession } from "next-auth";

import { BlogEditorialShell } from "@/components/blog/blog-editorial-shell";
import { authOptions } from "@/lib/auth";
import { getBlogPosts, getCourses } from "@/lib/api";
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
  const [posts, courses, session] = await Promise.all([
    getBlogPosts().catch(() => []),
    getCourses().catch(() => []),
    getServerSession(authOptions).catch(() => null),
  ]);

  const [featuredPost, ...otherPosts] = posts;
  const sidebarPosts = posts.slice(0, 3);

  return (
    <BlogEditorialShell>
      <main className="mx-auto max-w-[1200px] px-5 py-12 md:px-8">
        <section className="mb-20">
          <div className="mb-10 border-b border-[#c1c8c7] pb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6f5b3d]">Trading automation notes</p>
            <h1 className={`${playfair.className} mt-3 max-w-4xl text-4xl font-bold leading-tight tracking-tight text-[#032121] md:text-6xl`}>
              Trading automation, broker setup, and smarter bot strategy
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#414848]">
              Long-form guides for NOJAI users who want clear setup steps, honest risk notes, and better broker automation.
            </p>
          </div>

          {featuredPost ? (
            <article className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
              <Link href={`/blog/${encodeURIComponent(featuredPost.slug)}`} className="group overflow-hidden lg:col-span-8">
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
                  <div className="flex aspect-video items-center justify-center bg-[#e5e2e1] text-[#032121]">
                    <BookOpen className="h-14 w-14" />
                  </div>
                )}
              </Link>
              <div className="flex flex-col gap-4 lg:col-span-4">
                <span className="text-sm font-semibold uppercase tracking-[0.24em] text-[#032121]">{articleSection(featuredPost.title)}</span>
                <Link href={`/blog/${encodeURIComponent(featuredPost.slug)}`} className="group block">
                  <h2 className={`${playfair.className} text-4xl font-bold leading-tight text-[#1c1b1b] transition-colors group-hover:text-[#032121]`}>
                    {featuredPost.title}
                  </h2>
                </Link>
                <p className="text-lg leading-8 text-[#414848]">{postExcerpt(featuredPost.content, featuredPost.excerpt)}</p>
                <div className="mt-2 border-y border-[#c1c8c7] py-4 text-sm text-[#414848]">
                  <span className="font-semibold text-[#1c1b1b]">{featuredPost.author ?? "NOJAI Editorial"}</span>
                  <span className="mx-2">/</span>
                  <span>{formatDate(featuredPost.createdAt)}</span>
                  <span className="mx-2">/</span>
                  <span>{readingTime(featuredPost.content)}</span>
                </div>
              </div>
            </article>
          ) : (
            <div className="border border-[#c1c8c7] bg-white p-8 text-[#414848]">
              No posts yet. Check back soon.
            </div>
          )}
        </section>

        <div className="flex flex-col gap-8 lg:flex-row">
          <section className="flex-1">
            <div className="mb-8 flex items-center justify-between border-b-2 border-[#032121] pb-2">
              <h2 className={`${playfair.className} text-2xl font-semibold text-[#032121]`}>Latest Dispatches</h2>
              <Link href="/blog" className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f5b3d] hover:text-[#032121]">View all</Link>
            </div>

            {otherPosts.length === 0 ? (
              <p className="text-sm text-[#414848]">{featuredPost ? "More posts are coming soon." : "No posts yet. Check back soon."}</p>
            ) : (
              <div className="grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2">
                {otherPosts.map((post) => (
                  <article key={post._id} className="group flex flex-col gap-4">
                    <Link href={`/blog/${encodeURIComponent(post.slug)}`} className="overflow-hidden bg-[#e5e2e1]">
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
                        <div className="flex aspect-[3/2] items-center justify-center bg-[#e5e2e1] text-[#032121]">
                          <BookOpen className="h-10 w-10" />
                        </div>
                      )}
                    </Link>
                    <div>
                      <span className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6f5b3d]">{articleSection(post.title)}</span>
                      <Link href={`/blog/${encodeURIComponent(post.slug)}`} className="mt-2 block">
                        <h3 className={`${playfair.className} text-2xl font-semibold leading-snug text-[#1c1b1b] transition-colors group-hover:text-[#032121]`}>
                          {post.title}
                        </h3>
                      </Link>
                      <p className="mt-3 line-clamp-3 text-base leading-7 text-[#414848]">{postExcerpt(post.content, post.excerpt)}</p>
                      <span className="mt-3 block text-sm text-[#727878]">{formatDate(post.createdAt)} / {readingTime(post.content)}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {courses.length > 0 ? (
              <section className="mt-16 border-t-2 border-[#032121] pt-8">
                <h2 className={`${playfair.className} text-3xl font-semibold text-[#032121]`}>Learn the strategies behind the signals</h2>
                <div className="mt-8 space-y-8">
                  {courses.slice(0, 3).map((course) => {
                    if (!course._id) return null;
                    const courseHref = session
                      ? `/dashboard/courses/${course._id}`
                      : `/auth/register?callbackUrl=/dashboard/courses/${course._id}`;
                    return (
                      <Link key={course._id} href={courseHref} className="group flex flex-col gap-6 border-b border-[#c1c8c7] pb-8 md:flex-row">
                        {course.coverImage ? (
                          <Image src={course.coverImage} alt={course.title} width={320} height={220} className="aspect-[4/3] w-full object-cover md:w-56" unoptimized />
                        ) : null}
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f5b3d]">
                            {course.accessType === "paid" ? `Paid / ${formatCurrency(course.price ?? 0, course.currency ?? "USD")}` : "Free course"}
                          </p>
                          <h3 className={`${playfair.className} mt-2 text-2xl font-semibold text-[#1c1b1b] group-hover:text-[#032121]`}>{course.title}</h3>
                          {course.description ? <p className="mt-2 line-clamp-2 text-[#414848]">{course.description}</p> : null}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </section>

          <aside className="flex flex-col gap-10 lg:w-[300px]">
            <section className="flex flex-col gap-4">
              <div className="h-[2px] w-full bg-[#032121]" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-[#032121]">Search</h3>
              <div className="relative">
                <input className="w-full border-0 border-b border-[#c1c8c7] bg-transparent px-0 py-2 pr-9 text-[#1c1b1b] placeholder:text-[#727878] focus:border-[#032121] focus:ring-0" placeholder="Keywords..." />
                <Search className="absolute right-0 top-2.5 h-5 w-5 text-[#414848]" />
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <div className="h-[2px] w-full bg-[#032121]" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-[#032121]">Sections</h3>
              <ul className="flex flex-col gap-3">
                {["IQ Option", "ExpertOption", "AI Trading", "Copy Trading", "Risk Management"].map((section) => (
                  <li key={section} className="flex items-center justify-between border-b border-[#e5e2e1] pb-2 text-[#414848]">
                    <span>{section}</span>
                    <span className="text-sm text-[#727878]">
                      ({posts.filter((post) => articleSection(post.title) === section || post.title.toLowerCase().includes(section.toLowerCase().split(" ")[0])).length})
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="flex flex-col gap-4">
              <div className="h-[2px] w-full bg-[#032121]" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-[#032121]">Popular Posts</h3>
              <div className="flex flex-col gap-6">
                {sidebarPosts.map((post, index) => (
                  <Link key={post._id} href={`/blog/${encodeURIComponent(post.slug)}`} className="group flex gap-3">
                    <span className={`${playfair.className} text-[40px] leading-none text-[#032121]/20`}>{String(index + 1).padStart(2, "0")}</span>
                    <span>
                      <span className="block text-sm font-semibold leading-tight text-[#1c1b1b] group-hover:text-[#032121]">{post.title}</span>
                      <span className="mt-1 block text-sm text-[#727878]">{readingTime(post.content)}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-4 border border-[#c1c8c7] bg-[#f0edec] p-6">
              <h3 className={`${playfair.className} text-xl font-semibold text-[#032121]`}>The Weekly Dispatch</h3>
              <p className="text-sm leading-6 text-[#414848]">Broker guides, product updates, and practical risk notes from NOJAI.</p>
              <Link href="/auth/register" className="inline-flex w-full items-center justify-center gap-2 bg-[#032121] px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white hover:opacity-90">
                Start now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </section>
          </aside>
        </div>
      </main>
    </BlogEditorialShell>
  );
}
