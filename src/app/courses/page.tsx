import type { Metadata } from "next";

import Link from "next/link";

import { MarketingShell } from "@/components/layout/marketing-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCourses } from "@/lib/api";

export const metadata: Metadata = {
  title: "Courses — Learn Automated Trading with NOJAI",
  description:
    "Access trading courses designed to help you understand binary options, IQ Option strategy, and how to get the most from your NOJAI bot.",
  alternates: { canonical: "/courses" },
  openGraph: {
    title: "Courses — Learn Automated Trading with NOJAI",
    description: "Access trading courses designed to help you understand binary options, IQ Option strategy, and how to get the most from your NOJAI bot.",
    url: "/courses",
  },
};

export default async function CoursesPage() {
  const courses = await getCourses().catch(() => []);

  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <Badge>Courses</Badge>
        <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight">Educational content inside the same product experience</h1>
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <Card key={course._id}>
              <CardHeader>
                <CardTitle>{course.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{course.level ?? "All levels"}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-muted-foreground">{course.description}</p>
                <Link href={`/courses/${course.slug}`} className="mt-4 inline-flex text-sm font-semibold text-primary">
                  Open course
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}