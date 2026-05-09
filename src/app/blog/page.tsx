import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";

import { ArrowRight, BookOpen, CalendarDays, Star } from "lucide-react";
import { getServerSession } from "next-auth";

import { MarketingShell } from "@/components/layout/marketing-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { getBlogPosts, getCourses, getPublicReviews } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Blog - Trading Insights & NOJAI Updates",
  description:
    "Read the latest trading insights, product updates, and strategy guides from the NOJAI team.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog - Trading Insights & NOJAI Updates",
    description: "Read the latest trading insights, product updates, and strategy guides from the NOJAI team.",
    url: "/blog",
  },
};

function postExcerpt(content?: string, excerpt?: string) {
  if (excerpt?.trim()) return excerpt;
  const stripped = (content ?? "").replace(/[#*_>`-]/g, "").trim();
  return stripped.length > 150 ? `${stripped.slice(0, 150)}...` : stripped;
}

export default async function BlogPage() {
  const [posts, reviews, courses, session] = await Promise.all([
    getBlogPosts().catch(() => []),
    getPublicReviews().catch(() => []),
    getCourses().catch(() => []),
    getServerSession(authOptions).catch(() => null),
  ]);

  const [featuredPost, ...otherPosts] = posts;

  return (
    <MarketingShell>
      <section className="border-b border-slate-200 bg-slate-50/80 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-16">
          <div className="self-center">
            <Badge className="bg-primary/10 text-primary ring-1 ring-primary/20">NOJAI Blog</Badge>
            <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl dark:text-white">
              Trading guides, product updates, and broker automation playbooks
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-white/70">
              Clear articles for setting up brokers, understanding signals, managing risk, and getting better results from NOJAI.
            </p>
          </div>

          {featuredPost ? (
            <Link href={`/blog/${encodeURIComponent(featuredPost.slug)}`} className="group block">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]">
                {featuredPost.coverImage ? (
                  <Image src={featuredPost.coverImage} alt={featuredPost.title} width={1200} height={720} className="h-72 w-full object-cover" unoptimized />
                ) : (
                  <div className="flex h-72 items-center justify-center bg-slate-900 text-white">
                    <BookOpen className="h-12 w-12" />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500 dark:text-white/50">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      {formatDate(featuredPost.createdAt)}
                    </span>
                    <span>{featuredPost.author ?? "NOJAI Editorial"}</span>
                  </div>
                  <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{featuredPost.title}</h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600 dark:text-white/65">{postExcerpt(featuredPost.content, featuredPost.excerpt)}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    Read featured article
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65">
              No posts yet. Check back soon.
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge variant="outline">Latest articles</Badge>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Fresh from the NOJAI desk</h2>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-white/50">{posts.length} article{posts.length === 1 ? "" : "s"}</p>
        </div>

        {otherPosts.length === 0 ? (
          <p className="mt-8 text-sm text-slate-600 dark:text-white/60">{featuredPost ? "More posts are coming soon." : "No posts yet. Check back soon."}</p>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {otherPosts.map((post) => (
              <Link key={post._id} href={`/blog/${encodeURIComponent(post.slug)}`} className="group block">
                <Card className="h-full overflow-hidden border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]">
                  {post.coverImage ? (
                    <Image src={post.coverImage} alt={post.title} width={900} height={540} className="h-48 w-full object-cover" unoptimized />
                  ) : null}
                  <CardHeader>
                    <p className="text-sm text-slate-500 dark:text-white/50">{formatDate(post.createdAt)}</p>
                    <CardTitle className="text-slate-950 dark:text-white">{post.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-3 text-sm leading-7 text-slate-600 dark:text-white/65">{postExcerpt(post.content, post.excerpt)}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                      Read article
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {courses.length > 0 ? (
        <section className="border-t border-slate-200 bg-slate-50/80 dark:border-white/[0.06] dark:bg-white/[0.02]">
          <div className="mx-auto max-w-6xl px-6 py-14 lg:px-8">
            <Badge variant="outline">Courses</Badge>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Learn the strategies behind the signals</h2>
            <p className="mt-3 text-slate-600 dark:text-white/65">{session ? "Access all courses from your dashboard." : "Sign up to unlock all courses."}</p>
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => {
                if (!course._id) return null;
                const courseHref = session
                  ? `/dashboard/courses/${course._id}`
                  : `/auth/register?callbackUrl=/dashboard/courses/${course._id}`;
                return (
                  <Link key={course._id} href={courseHref} className="group block">
                    <Card className="h-full overflow-hidden border-slate-200 bg-white shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]">
                      {course.coverImage ? (
                        <Image
                          src={course.coverImage}
                          alt={course.title}
                          width={640}
                          height={360}
                          className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          unoptimized
                        />
                      ) : null}
                      <CardHeader>
                        <Badge variant={course.accessType === "paid" ? "default" : "outline"} className="w-fit">
                          {course.accessType === "paid" ? `Paid - ${formatCurrency(course.price ?? 0, course.currency ?? "USD")}` : "Free"}
                        </Badge>
                        <CardTitle className="leading-snug text-slate-950 dark:text-white">{course.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {course.description && <p className="line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-white/65">{course.description}</p>}
                        <span className="inline-flex text-sm font-semibold text-primary">
                          {session ? "Open course" : "Sign up to access"}
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {reviews.length > 0 ? (
        <section className="border-t border-slate-200 dark:border-white/[0.06]">
          <div className="mx-auto max-w-6xl px-6 py-14 lg:px-8">
            <Badge variant="outline">Reviews</Badge>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">What NOJAI users are saying</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {reviews.map((review) => (
                <div key={review._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < (review.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-white/15"}`}
                      />
                    ))}
                    <span className="ml-2 text-xs font-semibold text-amber-500">{review.rating}/5</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-white/75">{review.comment}</p>
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">{review.user?.name ?? "Verified user"}</p>
                    <p className="text-xs text-slate-500 dark:text-white/45">{formatDate(review.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </MarketingShell>
  );
}
