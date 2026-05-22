import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import nodemailer from "nodemailer";

import { authOptions } from "@/lib/auth";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  author?: string;
  publishedAt?: string;
  createdAt?: string;
}

interface User {
  _id: string;
  name?: string;
  email: string;
  subscription?: {
    active?: boolean;
    plan?: string;
  };
}

// ─── Email template ──────────────────────────────────────────────────────────

function buildEmailHtml(
  post: BlogPost,
  user: User,
  siteUrl: string,
): string {
  const postUrl = `${siteUrl}/blog/${encodeURIComponent(post.slug)}`;
  const isSubscribed = user.subscription?.active === true;
  const userName = user.name?.split(" ")[0] ?? "Trader";
  const coverHtml = post.coverImage
    ? `<img src="${post.coverImage}" alt="${post.title}" style="width:100%;max-height:420px;object-fit:cover;display:block;border-radius:10px 10px 0 0;" />`
    : "";
  const excerptHtml = post.excerpt
    ? `<p style="font-size:17px;line-height:1.75;color:#a1a1aa;margin:0 0 24px 0;">${post.excerpt}</p>`
    : "";
  const subscribeCta = isSubscribed
    ? ""
    : `
    <!-- Subscribe CTA for non-subscribers -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;background:#0f1f0f;border-radius:12px;border:1px solid #22c55e33;">
      <tr><td style="padding:28px 32px;">
        <p style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#22c55e;margin:0 0 10px 0;">YOU DON'T HAVE AN ACTIVE PLAN</p>
        <p style="font-size:16px;color:#e4e4e7;margin:0 0 20px 0;line-height:1.6;">
          Subscribe to NOJAI to get automated trading, copy trading, MT5 connectivity, and 24/7 bot execution on your account.
        </p>
        <a href="${siteUrl}/auth/register" style="display:inline-block;background:#22c55e;color:#0d0d0d;font-weight:800;font-size:14px;text-decoration:none;padding:13px 28px;border-radius:8px;letter-spacing:0.05em;">
          Subscribe to NOJAI Now →
        </a>
      </td></tr>
    </table>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${post.title}</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;color:#09090b;">
    ${post.excerpt ?? `New post from NOJAI: ${post.title}`}&nbsp;&#8203;&#8203;&#8203;
  </div>

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 16px;">
    <tr><td align="center">
      <!-- Card -->
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111113;border-radius:14px;border:1px solid #27272a;overflow:hidden;">

        <!-- Header -->
        <tr><td style="padding:28px 36px 20px 36px;border-bottom:1px solid #27272a;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-size:22px;font-weight:900;color:#f4f4f5;letter-spacing:-0.03em;">NOJAI</span>
                <span style="font-size:13px;color:#71717a;margin-left:10px;">Journal</span>
              </td>
              <td align="right">
                <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#22c55e;background:#0f1f0f;border:1px solid #22c55e33;padding:4px 10px;border-radius:99px;">New Post</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Cover image -->
        ${coverHtml ? `<tr><td>${coverHtml}</td></tr>` : ""}

        <!-- Body -->
        <tr><td style="padding:36px 36px 28px 36px;">
          <p style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#a78bfa;margin:0 0 14px 0;">Latest from NOJAI</p>
          <h1 style="font-size:26px;font-weight:900;color:#f4f4f5;margin:0 0 18px 0;line-height:1.25;letter-spacing:-0.02em;">
            ${post.title}
          </h1>
          ${excerptHtml}

          <p style="font-size:15px;color:#a1a1aa;margin:0 0 28px 0;line-height:1.7;">
            Hey ${userName}, we just published a new post on the NOJAI Journal. Tap below to read the full article.
          </p>

          <!-- CTA Button -->
          <a href="${postUrl}" style="display:inline-block;background:#f4bc4e;color:#0d0d0d;font-weight:800;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:0.04em;">
            Read full article →
          </a>

          ${subscribeCta}
        </td></tr>

        <!-- Divider -->
        <tr><td style="height:1px;background:#27272a;"></td></tr>

        <!-- Also on NOJAI -->
        <tr><td style="padding:24px 36px;">
          <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#71717a;margin:0 0 16px 0;">Also on NOJAI</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:8px;">
                <a href="${siteUrl}/mt5-trading" style="display:block;background:#0c1a2e;border:1px solid #1e3a5f;border-radius:8px;padding:12px 14px;text-decoration:none;">
                  <span style="font-size:11px;font-weight:700;color:#38bdf8;text-transform:uppercase;letter-spacing:0.15em;display:block;">MT5 Trading</span>
                  <span style="font-size:13px;color:#e4e4e7;margin-top:4px;display:block;">Connect any MT5 broker & automate 24/7</span>
                </a>
              </td>
              <td style="padding-left:8px;">
                <a href="${siteUrl}/copy-trading-for-beginners" style="display:block;background:#0d1a0d;border:1px solid #1a3a1a;border-radius:8px;padding:12px 14px;text-decoration:none;">
                  <span style="font-size:11px;font-weight:700;color:#34d399;text-transform:uppercase;letter-spacing:0.15em;display:block;">Copy Trading</span>
                  <span style="font-size:13px;color:#e4e4e7;margin-top:4px;display:block;">Mirror pro traders on your account</span>
                </a>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 36px 28px 36px;border-top:1px solid #27272a;text-align:center;">
          <p style="font-size:12px;color:#52525b;margin:0 0 8px 0;">
            You received this because you have an account on NOJAI.
          </p>
          <p style="font-size:12px;color:#52525b;margin:0;">
            <a href="${siteUrl}" style="color:#71717a;text-decoration:none;">nojai.app</a>
            &nbsp;·&nbsp;
            <a href="${siteUrl}/privacy" style="color:#71717a;text-decoration:none;">Privacy</a>
            &nbsp;·&nbsp;
            <a href="${siteUrl}/contact" style="color:#71717a;text-decoration:none;">Unsubscribe</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Transport ────────────────────────────────────────────────────────────────

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const secure = process.env.SMTP_SECURE !== "false";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in your .env file.",
    );
  }

  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 1. Admin check
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorised" }, { status: 401 });
    }

    const body = await req.json() as { postId: string; siteUrl?: string };
    const { postId } = body;
    const siteUrl = (body.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://nojai.app").replace(/\/$/, "");

    if (!postId) {
      return NextResponse.json({ message: "postId is required" }, { status: 400 });
    }

    // 2. Get blog post from backend
    const backendUrl = (
      process.env.API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:5000/api"
    ).replace(/\/$/, "");

    const token = (session as { accessToken?: string }).accessToken ?? "";
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

    const [postRes, usersRes] = await Promise.all([
      fetch(`${backendUrl}/admin/blog/${postId}`, {
        headers: { "Content-Type": "application/json", ...authHeader },
        cache: "no-store",
      }),
      fetch(`${backendUrl}/admin/users`, {
        headers: { "Content-Type": "application/json", ...authHeader },
        cache: "no-store",
      }),
    ]);

    if (!postRes.ok) {
      return NextResponse.json({ message: "Blog post not found" }, { status: 404 });
    }

    const post = (await postRes.json()) as BlogPost;
    const usersData = await usersRes.json();
    const users: User[] = Array.isArray(usersData)
      ? usersData
      : (usersData?.users ?? usersData?.data ?? []);

    if (!users.length) {
      return NextResponse.json({ message: "No users found to send to" }, { status: 400 });
    }

    // 3. Send emails
    const transport = createTransport();
    const fromAddress = process.env.EMAIL_FROM ?? `NOJAI <noreply@nojai.app>`;

    const results = await Promise.allSettled(
      users
        .filter((u) => u.email?.includes("@"))
        .map((user) =>
          transport.sendMail({
            from: fromAddress,
            to: user.email,
            subject: `📊 ${post.title} — NOJAI Journal`,
            html: buildEmailHtml(post, user, siteUrl),
            // Attach cover image inline if it's a CDN URL
            ...(post.coverImage
              ? {
                  attachments: [
                    {
                      filename: "cover.jpg",
                      path: post.coverImage,
                      cid: "cover@nojai",
                    },
                  ],
                }
              : {}),
            headers: {
              "X-Mailer": "NOJAI Newsletter",
              "List-Unsubscribe": `<${siteUrl}/contact>`,
            },
          }),
        ),
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: results.length,
      message: `Newsletter sent to ${sent} user${sent === 1 ? "" : "s"}${failed > 0 ? ` (${failed} failed)` : ""}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[send-newsletter]", message);
    return NextResponse.json({ message }, { status: 500 });
  }
}
