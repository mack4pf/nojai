"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export function CourseCarousel({ courses }: { courses: Course[] }) {
  const [query, setQuery] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (query || filteredCourses.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const nextLeft = scroller.scrollLeft + Math.min(380, scroller.clientWidth * 0.82);
      const nearEnd = nextLeft + scroller.clientWidth >= scroller.scrollWidth - 24;
      scroller.scrollTo({ left: nearEnd ? 0 : nextLeft, behavior: "smooth" });
    }, 4200);
    return () => window.clearInterval(timer);
  }, [filteredCourses.length, query]);

  function scrollBy(direction: -1 | 1) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({ left: direction * Math.min(420, scroller.clientWidth * 0.88), behavior: "smooth" });
  }

  if (courses.length === 0) return null;

  return (
    <section id="courses" className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Badge variant="outline">Courses</Badge>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight">Learn from NOJAI courses</h2>
          <p className="mt-3 text-muted-foreground">
            Public course links are ready to share. Browse the lessons, open a course, or search for exactly what you need.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search courses"
              className="h-11 w-full rounded-full border border-border bg-background/80 pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary sm:w-72"
            />
          </div>
          <Button asChild variant="outline">
            <Link href="/courses">
              View all
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {filteredCourses.length} course{filteredCourses.length === 1 ? "" : "s"} available
        </p>
        <div className="flex gap-2">
          <Button type="button" size="icon" variant="outline" onClick={() => scrollBy(-1)} aria-label="Previous courses">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="outline" onClick={() => scrollBy(1)} aria-label="Next courses">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
            No courses matched your search.
          </CardContent>
        </Card>
      ) : (
        <div
          ref={scrollerRef}
          className="mt-6 flex snap-x gap-5 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {filteredCourses.map((course) => (
            <Link
              key={course._id}
              href={courseHref(course)}
              className="group block w-[82vw] shrink-0 snap-start sm:w-[420px]"
            >
              <Card className="h-full overflow-hidden transition-all group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:bg-white/[0.04]">
                <div className="relative h-56 overflow-hidden border-b border-white/10 bg-muted">
                  {course.coverImage ? (
                    <Image
                      src={course.coverImage}
                      alt={course.title}
                      fill
                      sizes="(max-width: 640px) 82vw, 420px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,rgba(244,188,78,0.18),rgba(56,189,248,0.12))]">
                      <BookOpen className="h-12 w-12 text-primary" />
                    </div>
                  )}
                  <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                    <Badge variant={course.accessType === "paid" ? "default" : "secondary"}>
                      {course.accessType === "paid" ? formatCurrency(course.price ?? 0, course.currency ?? "USD") : "Free"}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-5">
                  <p className="line-clamp-2 font-display text-2xl font-semibold leading-tight">{course.title}</p>
                  {course.description && (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{course.description}</p>
                  )}
                  <span className="mt-5 inline-flex items-center text-sm font-semibold text-primary">
                    Open course
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
