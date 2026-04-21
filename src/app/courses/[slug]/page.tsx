import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { MarketingShell } from "@/components/layout/marketing-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { getCourse } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface CourseDetailPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: CourseDetailPageProps): Promise<Metadata> {
  const course = await getCourse(params.slug).catch(() => null);
  if (!course) return { title: "Course not found" };
  return {
    title: course.title,
    description: course.description ?? `Learn from the NOJAI course: ${course.title}.`,
    alternates: { canonical: `/courses/${params.slug}` },
    openGraph: {
      title: course.title,
      description: course.description ?? `Learn from the NOJAI course: ${course.title}.`,
      url: `/courses/${params.slug}`,
      ...(course.coverImage ? { images: [{ url: course.coverImage, width: 1280, height: 720, alt: course.title }] } : {}),
    },
  };
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  // If logged in, send straight to dashboard course page
  const session = await getServerSession(authOptions);
  if (session) {
    redirect(`/dashboard/courses/${params.slug}`);
  }

  const course = await getCourse(params.slug).catch(() => null);
  if (!course) notFound();

  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        {/* Cover */}
        {course.coverImage && (
          <div className="mb-8 overflow-hidden rounded-3xl border border-white/10">
            <Image
              src={course.coverImage}
              alt={course.title}
              width={1280}
              height={480}
              className="h-64 w-full object-cover sm:h-80"
              unoptimized
            />
          </div>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Course</Badge>
          {course.accessType === "paid" ? (
            <Badge>Paid · {formatCurrency(course.price ?? 0, course.currency ?? "USD")}</Badge>
          ) : (
            <Badge variant="secondary">Free</Badge>
          )}
        </div>

        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight lg:text-5xl">
          {course.title}
        </h1>

        {course.description && (
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{course.description}</p>
        )}

        <div className="mt-10 flex flex-wrap gap-4">
          <Link href={`/auth/register?callbackUrl=/dashboard/courses/${params.slug}`}>
            <Button size="lg">
              {course.accessType === "paid" ? "Purchase & Enroll" : "Sign up to access"}
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button size="lg" variant="outline">Sign in</Button>
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
