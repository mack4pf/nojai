import type { MetadataRoute } from "next";

import { getBlogPosts, getCourses } from "@/lib/api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nojai.io";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/courses`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];

  // Dynamic blog posts
  const posts = await getBlogPosts().catch(() => []);
  const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.createdAt ? new Date(post.createdAt) : now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Dynamic courses
  const courses = await getCourses().catch(() => []);
  const courseRoutes: MetadataRoute.Sitemap = courses.map((course) => ({
    url: `${SITE_URL}/courses/${course.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...blogRoutes, ...courseRoutes];
}
