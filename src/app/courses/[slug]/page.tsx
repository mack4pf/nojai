import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { MarketingShell } from "@/components/layout/marketing-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CourseShareButton } from "@/components/marketing/course-share-button";
import { getCourseByPublicIdentifier } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface CourseDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: CourseDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseByPublicIdentifier(slug).catch(() => null);
  if (!course) return { title: "Course not found" };
  const coursePath = `/courses/${course.slug || slug}`;
  return {
    title: course.title,
    description: course.description ?? `Learn from the NOJAI course: ${course.title}.`,
    alternates: { canonical: coursePath },
    openGraph: {
      title: course.title,
      description: course.description ?? `Learn from the NOJAI course: ${course.title}.`,
      url: coursePath,
      ...(course.coverImage ? { images: [{ url: course.coverImage, width: 1280, height: 720, alt: course.title }] } : {}),
    },
  };
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { slug } = await params;
  const course = await getCourseByPublicIdentifier(slug).catch(() => null);
  if (!course) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nojai.io";
  const coursePath = `/courses/${course.slug || slug}`;
  const courseUrl = `${siteUrl}${coursePath}`;
  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description ?? `Learn from the NOJAI course: ${course.title}.`,
    provider: {
      "@type": "Organization",
      name: "NOJAI",
      sameAs: siteUrl,
    },
    url: courseUrl,
    ...(course.coverImage ? { image: [course.coverImage] } : {}),
    ...(course.accessType === "paid"
      ? {
          offers: {
            "@type": "Offer",
            category: "Paid",
            price: Number(course.price ?? 0),
            priceCurrency: String(course.currency ?? "USD").toUpperCase(),
          },
        }
      : {
          offers: {
            "@type": "Offer",
            category: "Free",
            price: 0,
            priceCurrency: "USD",
          },
        }),
  };

  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
        />
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
          <Link href={`/auth/register?callbackUrl=/dashboard/courses/${course.slug || course._id}`}>
            <Button size="lg">
              {course.accessType === "paid" ? "Purchase & Enroll" : "Sign up to access"}
            </Button>
          </Link>
          <Link href={`/dashboard/courses/${course.slug || course._id}`}>
            <Button size="lg" variant="outline">Open in dashboard</Button>
          </Link>
          <Link href="/auth/login">
            <Button size="lg" variant="ghost">Sign in</Button>
          </Link>
        </div>

        <div className="mt-5">
          <CourseShareButton url={coursePath} />
        </div>
      </section>
    </MarketingShell>
  );
}
