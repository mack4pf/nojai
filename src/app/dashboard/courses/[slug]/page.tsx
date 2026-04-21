"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import { ArrowLeft, Download, FileIcon, Loader2, Lock, Play } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailNotice } from "@/components/ui/email-notice";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { Course, CourseAsset } from "@/types";

interface Props {
  params: Promise<{ slug: string }> | { slug: string };
}

interface CourseResponse extends Course {
  hasAccess?: boolean;
}

function AssetCard({ asset }: { asset: CourseAsset }) {
  const isImage = asset.type === "image";
  const isVideo = asset.type === "video";

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      {isImage && asset.url && (
        <div className="mb-3 overflow-hidden rounded-xl">
          <Image src={asset.url} alt={asset.name} width={640} height={360} className="h-40 w-full object-cover" unoptimized />
        </div>
      )}
      {isVideo && asset.url && (
        <div className="mb-3 aspect-video overflow-hidden rounded-xl bg-black">
          <video src={asset.url} controls className="h-full w-full" />
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
          <FileIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{asset.name}</p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{asset.type}</p>
        </div>
        <a href={asset.url} target="_blank" rel="noreferrer" download={asset.name}>
          <Button size="sm" variant="outline">
            <Download className="h-3.5 w-3.5 mr-1" />
            Open
          </Button>
        </a>
      </div>
    </div>
  );
}

export default function DashboardCourseDetailPage({ params }: Props) {
  const resolvedParams = "then" in params ? use(params as Promise<{ slug: string }>) : params;
  const courseId = resolvedParams.slug;

  const [course, setCourse] = useState<CourseResponse | null>(null);
  const [locked, setLocked] = useState(false);
  const [lockedPreview, setLockedPreview] = useState<Partial<Course> | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!courseId || courseId === "undefined") {
      setStatus("error");
      setErrorMsg("Invalid course link.");
      return;
    }

    api.get(`/user/courses/${courseId}`)
      .then((res) => {
        setCourse(res.data as CourseResponse);
        setLocked(false);
        setStatus("ready");
      })
      .catch((err: Error) => {
        // 403 = purchase required — backend sends partial course data
        if (err.message?.toLowerCase().includes("purchase") || err.message?.includes("403")) {
          // Re-fetch the public endpoint for preview
          api.get(`/user/courses/${courseId}`)
            .catch(() => null);
          setLocked(true);
          setStatus("ready");
          // Try public endpoint for preview data
          fetch(`/backend/courses/${courseId}`)
            .then((r) => r.ok ? r.json() : null)
            .then((data: unknown) => {
              if (data && typeof data === "object") setLockedPreview(data as Partial<Course>);
            })
            .catch(() => null);
        } else if (err.message?.includes("not found") || err.message?.includes("404")) {
          setStatus("error");
          setErrorMsg("Course not found.");
        } else if (err.message?.includes("Invalid") || err.message?.includes("400")) {
          setStatus("error");
          setErrorMsg("Invalid course link.");
        } else {
          setStatus("error");
          setErrorMsg(err.message ?? "Failed to load course.");
        }
      });
  }, [courseId]);

  // Handle 403 by parsing the error response body
  useEffect(() => {
    if (!courseId || courseId === "undefined") return;

    // Use raw fetch to get the full error body including the preview course
    fetch(`/backend/user/courses/${courseId}`, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }).then(async (res) => {
      const body = await res.json().catch(() => ({})) as { course?: Partial<Course>; message?: string };
      if (res.status === 403 && body.course) {
        setLocked(true);
        setLockedPreview(body.course);
        setStatus("ready");
      }
    }).catch(() => null);
  }, [courseId]);

  async function enrollFree() {
    if (!courseId) return;
    setEnrolling(true);
    try {
      await api.post(`/user/courses/${courseId}/enroll-free`);
      toast.success("Course added to your library. A confirmation email has been sent.");
      const res = await api.get(`/user/courses/${courseId}`);
      setCourse(res.data as CourseResponse);
      setLocked(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enroll failed");
    } finally {
      setEnrolling(false);
    }
  }

  async function startPayment(provider: "paystack" | "crypto") {
    if (!courseId) return;
    setPaying(true);
    try {
      const endpoint = provider === "paystack" ? "/payment/initialize/course/paystack" : "/payment/initialize/course/crypto";
      const res = await api.post(endpoint, { courseId });
      const url = (res.data as Record<string, string>)?.authorization_url ?? (res.data as Record<string, string>)?.checkout_url;
      if (!url) throw new Error("Payment URL missing");
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
      setPaying(false);
    }
  }

  const preview = locked ? lockedPreview : null;
  const displayCourse = course ?? preview;

  if (status === "loading") {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <Link href="/dashboard/courses" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to courses
        </Link>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-6 text-center">
          <p className="font-semibold text-red-400">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 lg:p-8">
      {/* Back */}
      <Link href="/dashboard/courses" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to courses
      </Link>

      {/* Cover */}
      {displayCourse?.coverImage ? (
        <div className="relative overflow-hidden rounded-3xl border border-white/10">
          <Image src={displayCourse.coverImage} alt={displayCourse.title ?? ""} width={1280} height={480} className="h-56 w-full object-cover sm:h-72" unoptimized />
          {locked && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <Lock className="h-12 w-12 text-white/70" />
            </div>
          )}
        </div>
      ) : null}

      {/* Header */}
      <div>
        <div className="flex flex-wrap gap-2 mb-3">
          {displayCourse?.accessType === "paid" ? (
            <Badge variant={locked ? "secondary" : "success"}>
              {locked ? `Paid · ${formatCurrency(displayCourse.price ?? 0, displayCourse.currency ?? "USD")}` : "Purchased"}
            </Badge>
          ) : (
            <Badge variant="outline">Free</Badge>
          )}
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{displayCourse?.title ?? "Course"}</h1>
        {displayCourse?.description && <p className="mt-3 max-w-2xl text-muted-foreground">{displayCourse.description}</p>}
      </div>

      {/* Locked state — purchase required */}
      {locked && (
        <Card className="border-amber-500/20 bg-amber-500/[0.04]">
          <CardHeader>
            <CardTitle className="text-amber-300 flex items-center gap-2">
              <Lock className="h-5 w-5" /> Purchase Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This is a paid course. Purchase it to unlock all content and materials.
            </p>
            {preview?.accessType === "free" ? (
              <Button onClick={enrollFree} disabled={enrolling}>
                {enrolling ? "Adding..." : "Add to Library for Free"}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => startPayment("paystack")} disabled={paying}>
                    {paying ? "Redirecting..." : "Pay with Paystack"}
                  </Button>
                  <Button variant="outline" onClick={() => startPayment("crypto")} disabled={paying}>
                    Pay with Crypto
                  </Button>
                </div>
                <EmailNotice
                  variant="sent"
                  message="Course access will be emailed to you once payment is confirmed. Crypto payments may take a few minutes to verify."
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Unlocked — full content */}
      {!locked && course && (
        <>
          {/* Main video */}
          {course.videoUrl && (
            <div className="space-y-2">
              <h2 className="flex items-center gap-2 font-semibold">
                <Play className="h-4 w-4" /> Course Video
              </h2>
              {course.videoUrl.includes("youtu") ? (
                <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
                  <iframe
                    className="h-full w-full"
                    src={course.videoUrl.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
                  <video src={course.videoUrl} controls className="h-full w-full" />
                </div>
              )}
            </div>
          )}

          {/* Content */}
          {course.content && course.content.trim() && (
            <div className="prose prose-invert max-w-none rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
              <div dangerouslySetInnerHTML={{ __html: course.content }} />
            </div>
          )}

          {/* Assets */}
          {(course.assets ?? []).length > 0 && (
            <div className="space-y-4">
              <h2 className="font-semibold">Course Materials ({(course.assets ?? []).length})</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {(course.assets ?? []).map((asset, idx) => (
                  <AssetCard key={idx} asset={asset} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}



