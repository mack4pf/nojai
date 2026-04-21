import Link from "next/link";
import { ArrowUpRight, PlayCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { freeVideoResources } from "@/lib/marketing";

interface VideoResourcesProps {
  eyebrow?: string;
  title: string;
  description: string;
}

export function VideoResources({ eyebrow = "Free Resources", title, description }: VideoResourcesProps) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <Badge variant="outline">{eyebrow}</Badge>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">{title}</h2>
          <p className="mt-4 text-base font-medium leading-8 text-muted-foreground sm:text-lg">{description}</p>
        </div>
      </div>

      <div className="mt-10 grid gap-6 xl:grid-cols-2">
        {freeVideoResources.map((video) => (
          <Card key={video.youtubeId} className="overflow-hidden border-white/10 bg-white/[0.04]">
            <CardContent className="p-0">
              <div className="border-b border-white/10 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={video.badgeClassName}>{video.badge}</Badge>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-muted-foreground">
                    <PlayCircle className="h-3.5 w-3.5 text-primary" />
                    Embedded lesson
                  </div>
                </div>
                <h3 className="mt-4 font-display text-2xl font-bold leading-tight">{video.title}</h3>
                <p className="mt-3 text-sm font-medium leading-7 text-muted-foreground">{video.description}</p>
              </div>

              <div className="p-4 sm:p-5">
                <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/40 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
                  <div className="aspect-video w-full">
                    <iframe
                      src={`https://www.youtube.com/embed/${video.youtubeId}`}
                      title={video.title}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href={video.href} target="_blank" rel="noreferrer">
                      Watch on YouTube
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}