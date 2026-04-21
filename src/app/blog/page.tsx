import type { Metadata } from "next";

import Link from "next/link";
import Image from "next/image";

import { Star } from "lucide-react";
import { getServerSession } from "next-auth";

export const metadata: Metadata = {
  title: "Blog — Trading Insights & NOJAI Updates",
  description:
    "Read the latest trading insights, product updates, and strategy guides from the NOJAI team.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog — Trading Insights & NOJAI Updates",
    description: "Read the latest trading insights, product updates, and strategy guides from the NOJAI team.",
    url: "/blog",
  },
};

import { MarketingShell } from "@/components/layout/marketing-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { getBlogPosts, getPublicReviews, getCourses } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function BlogPage() {
  const [posts, reviews, courses, session] = await Promise.all([
    getBlogPosts().catch(() => []),
    getPublicReviews().catch(() => []),
    getCourses().catch(() => []),
    getServerSession(authOptions).catch(() => null),
  ]);

  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <Badge>Blog</Badge>
        <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight">Insights, product updates, and trading playbooks</h1>
        {posts.length === 0 ? (
          <p className="mt-10 text-sm text-muted-foreground">No posts yet. Check back soon.</p>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <Card key={post._id}>
                {post.coverImage ? (
                  <div className="overflow-hidden rounded-t-[inherit] border-b border-white/10">
                    <Image src={post.coverImage} alt={post.title} width={1200} height={720} className="h-56 w-full object-cover" unoptimized />
                  </div>
                ) : null}
                <CardHeader>
                  <p className="text-sm text-muted-foreground">{formatDate(post.createdAt)}</p>
                  <CardTitle>{post.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-7 text-muted-foreground">{post.excerpt ?? (post.content ? post.content.slice(0, 160) + "..." : "")}</p>
                  <Link href={`/blog/${post.slug}`} className="mt-4 inline-flex text-sm font-semibold text-primary">
                    Read article
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {courses.length > 0 ? (
        <section className="border-t border-white/[0.06] bg-white/[0.02]">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
            <Badge variant="outline">Courses</Badge>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight">Learn the strategies behind the signals</h2>
            <p className="mt-3 text-muted-foreground">{session ? "Access all courses from your dashboard." : "Sign up to unlock all courses."}</p>
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => {
                if (!course._id) return null;
                const courseHref = session
                  ? `/dashboard/courses/${course._id}`
                  : `/auth/register?callbackUrl=/dashboard/courses/${course._id}`;
                return (
                  <Link key={course._id} href={courseHref} className="group block">
                    <Card className="h-full transition-all group-hover:border-white/20 group-hover:bg-white/[0.04]">
                      {course.coverImage ? (
                        <div className="overflow-hidden rounded-t-[inherit] border-b border-white/10">
                          <Image
                            src={course.coverImage}
                            alt={course.title}
                            width={640}
                            height={360}
                            className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            unoptimized
                          />
                        </div>
                      ) : null}
                      <CardHeader>
                        <Badge variant={course.accessType === "paid" ? "default" : "outline"} className="w-fit">
                          {course.accessType === "paid" ? `Paid · ${formatCurrency(course.price ?? 0, course.currency ?? "USD")}` : "Free"}
                        </Badge>
                        <CardTitle className="leading-snug">{course.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {course.description && <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">{course.description}</p>}
                        <span className="inline-flex text-sm font-semibold text-primary">
                          {session ? "Open course →" : "Sign up to access →"}
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
        <section className="border-t border-white/[0.06] bg-white/[0.02]">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
            <Badge variant="outline">Reviews</Badge>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight">What NOJAI users are saying</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {reviews.map((review) => (
                <div key={review._id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < (review.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-white/10"}`}
                      />
                    ))}
                    <span className="ml-2 text-xs font-semibold text-amber-400">{review.rating}/5</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/80">{review.comment}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{review.user?.name ?? "Verified user"}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
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