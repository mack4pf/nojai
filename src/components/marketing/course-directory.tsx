"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { ArrowRight, BookOpen, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { Course } from "@/types";

function courseHref(course: Course) {
  if (course.shareUrl) {
    try {
      return new URL(course.shareUrl).pathname;
    } catch {
      return course.shareUrl;
    }
  }
  return `/courses/${course.slug || course._id}`;
}

export function CourseDirectory({ courses }: { courses: Course[] }) {
  const [query, setQuery] = useState("");
  const filteredCourses = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return courses;
    return courses.filter((course) => [
      course.title,
      course.description,
      course.accessType,
      course.currency,
    ].some((value) => String(value ?? "").toLowerCase().includes(normalized)));
  }, [courses, query]);

  return (
    <div className="mt-10 space-y-6">
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by course title, topic, free or paid"
          className="h-12 w-full rounded-full border border-border bg-background/80 pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
        />
      </div>

      {filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
            No courses matched your search.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredCourses.map((course) => (
            <Link key={course._id} href={courseHref(course)} className="group block">
              <Card className="h-full overflow-hidden transition-all group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:bg-white/[0.04]">
                <div className="relative h-48 overflow-hidden border-b border-white/10 bg-muted">
                  {course.coverImage ? (
                    <Image
                      src={course.coverImage}
                      alt={course.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,rgba(244,188,78,0.18),rgba(56,189,248,0.12))]">
                      <BookOpen className="h-10 w-10 text-primary" />
                    </div>
                  )}
                </div>
                <CardHeader>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={course.accessType === "paid" ? "default" : "secondary"}>
                      {course.accessType === "paid" ? formatCurrency(course.price ?? 0, course.currency ?? "USD") : "Free"}
                    </Badge>
                  </div>
                  <CardTitle>{course.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {course.description && <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">{course.description}</p>}
                  <span className="mt-4 inline-flex items-center text-sm font-semibold text-primary">
                    Open course
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
