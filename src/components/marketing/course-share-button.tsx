"use client";

import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function CourseShareButton({ url }: { url: string }) {
  async function copyLink() {
    const absoluteUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      toast.success("Course link copied");
    } catch {
      toast.error("Could not copy course link");
    }
  }

  async function shareLink() {
    const absoluteUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "NOJAI course", url: absoluteUrl });
        return;
      } catch {
        return;
      }
    }
    await copyLink();
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button type="button" variant="outline" size="lg" onClick={copyLink}>
        <Copy className="mr-2 h-4 w-4" />
        Copy course link
      </Button>
      <Button type="button" variant="ghost" size="lg" onClick={shareLink}>
        <Share2 className="mr-2 h-4 w-4" />
        Share
      </Button>
    </div>
  );
}
