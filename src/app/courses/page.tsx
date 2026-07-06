import type { Metadata } from "next";

import { MarketingShell } from "@/components/layout/marketing-shell";
import { Badge } from "@/components/ui/badge";
import { CourseDirectory } from "@/components/marketing/course-directory";
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
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Search all public NOJAI courses and open any course link directly, even before creating an account.
        </p>
        <CourseDirectory courses={courses} />
      </section>
    </MarketingShell>
  );
}
