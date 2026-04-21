import Image from "next/image";
import Link from "next/link";

import { GraduationCap, Lock } from "lucide-react";
import { getServerSession } from "next-auth";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { getUserCourses } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";

export default async function DashboardCoursesPage() {
  await requireSession("user");
  const session = await getServerSession(authOptions);
  const courses = await getUserCourses(session?.accessToken ?? "").catch(() => []);

  return (
    <div className="space-y-8 p-6 lg:p-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Courses</h1>
        <p className="mt-2 text-muted-foreground">Learn the strategies and tools behind successful trading with NOJAI.</p>
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-white/[0.02] py-20 text-center">
          <GraduationCap className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">No courses available yet. Check back soon.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            if (!course._id) return null;
            const locked = !course.hasAccess && course.accessType === "paid";
            return (
              <Link key={course._id} href={`/dashboard/courses/${course._id}`} className="group block">
                <Card className={`h-full transition-all group-hover:border-white/20 group-hover:bg-white/[0.04] ${locked ? "opacity-80" : ""}`}>
                  {course.coverImage ? (
                    <div className="relative overflow-hidden rounded-t-[inherit] border-b border-white/10">
                      <Image
                        src={course.coverImage}
                        alt={course.title}
                        width={640}
                        height={360}
                        className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        unoptimized
                      />
                      {locked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <Lock className="h-8 w-8 text-white/80" />
                        </div>
                      )}
                    </div>
                  ) : null}
                  <CardHeader>
                    <div className="flex flex-wrap gap-2">
                      {course.accessType === "paid" ? (
                        <Badge variant={locked ? "secondary" : "success"}>
                          {locked ? `Buy · ${formatCurrency(course.price ?? 0, course.currency ?? "USD")}` : "Purchased"}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Free</Badge>
                      )}
                    </div>
                    <CardTitle className="leading-snug">{course.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {course.description && <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">{course.description}</p>}
                    <span className="mt-3 inline-flex text-sm font-semibold text-primary">
                      {locked ? "View & Purchase →" : "Open course →"}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
