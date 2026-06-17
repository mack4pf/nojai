import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";
import { WebVitalsReporter } from "@/components/providers/web-vitals-reporter";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nojai.io";
const SITE_NAME = "NOJAI";
const DEFAULT_DESCRIPTION =
  "Advanced trading automation for Binary Options, Forex, and MT5. Unlock the Olymp Trade bot free tier, connect IQ Option, Expert Option, Olymp Trade, and MT5. Binary default: EURUSD. MT5 defaults: BTCUSD, EURUSD, XAUUSD.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Automated Trading for Binary Options & Forex`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    // Core product
    "automated trading bot",
    "trade automation software",
    "trading bot software",
    "auto trading software",
    "algorithmic trading bot",
    "trading automation",
    "NOJAI trading",
    // How-to / informational (long-tail SEO)
    "how to automate trades",
    "how to automate forex trading",
    "how to automate binary options trading",
    "trading bot for beginners",
    "how to use a trading bot",
    "how to copy trade MT5",
    "how to set up a trading bot",
    "how to make money with trading bots",
    "best trading bot for beginners",
    "is automated trading profitable",
    // Binary Options
    "binary options trading bot",
    "binary options bot",
    "binary options automation",
    "binary options signals",
    "best binary options bot",
    "binary options auto trader",
    "binary options robot",
    "binary options strategy bot",
    "automated binary options trading",
    "binary options trading software",
    "free binary options bot",
    // IQ Option
    "IQ Option bot",
    "IQ Option trading bot",
    "IQ Option automation",
    "IQ Option auto trader",
    "IQ Option signals bot",
    "IQ Option strategy bot",
    "IQ Option copy trading",
    // Expert Option
    "Expert Option bot",
    "Expert Option trading bot",
    "Expert Option automation",
    "Expert Option auto trader",
    "Expert Option signals bot",
    "Expert Option strategy bot",
    "Expert Option copy trading",
    "best Expert Option bot",
    // Olymp Trade
    "Olymp Trade bot",
    "Olymp Trade free trial",
    "free Olymp Trade bot",
    "Olymp Trade free tier",
    "Olymp Trade trading bot",
    "Olymp Trade automation",
    "Olymp Trade signals bot",
    "Olymp Trade copy trading",
    "EURUSD binary options bot",
    // Forex
    "forex trading bot",
    "forex automation",
    "forex auto trader",
    "automated forex trading software",
    "forex robot",
    "forex EA bot",
    "forex signal bot",
    "best forex trading bot 2025",
    "forex trading automation software",
    // MT5 / MetaTrader
    "MT5 trading bot",
    "MT5 copy trading",
    "MT5 copy trading software",
    "MT5 automated trading",
    "MetaTrader 5 bot",
    "MetaTrader 5 copy trading",
    "MT5 expert advisor bot",
    "MT5 signal copier",
    "best MT5 copy trading platform",
    "MT5 trade copier",
    "MetaTrader 5 automation",
    "MT5 algorithmic trading",
    // Copy Trading
    "copy trading",
    "copy trading platform",
    "copy trading software",
    "auto copy trading",
    "best copy trading platform 2025",
    "copy trade forex",
    "copy trading for beginners",
    "social trading platform",
    "mirror trading software",
    // TradingView
    "TradingView webhook",
    "TradingView webhook bot",
    "TradingView to broker automation",
    "TradingView alert bot",
    "TradingView auto trading",
    "TradingView strategy automation",
    "TradingView pine script bot",
    "TradingView signal to MT5",
    // General signals & passive income
    "auto trade signals",
    "trading signals bot",
    "passive trading income",
    "24/7 trading bot",
    "best trading bot 2025",
    "make money with trading bot",
    "trading bot that works",
    "reliable trading bot",
    "trading bot no coding",
    "trading bot multiple brokers",
    "multi broker trading bot",
    "trading bot live dashboard",
  ],
  authors: [{ name: "Nathaniel Onoja", url: SITE_URL }],
  creator: "Nathaniel Onoja",
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Advanced Trading Automation`,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "NOJAI — Advanced Trading Automation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Automated Trading for Any Broker`,
    description: DEFAULT_DESCRIPTION,
    images: ["/og-image.png"],
    creator: "@nojai_io",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: "https://nojai.io",
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION
      ? {
          "msvalidate.01": process.env.BING_SITE_VERIFICATION,
        }
      : undefined,
  },
  category: "finance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/logo.jpg`,
        },
        sameAs: [],
        description: DEFAULT_DESCRIPTION,
        founder: {
          "@type": "Person",
          name: "Nathaniel Onoja",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/blog?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${manrope.variable} ${spaceGrotesk.variable} h-full`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full font-sans">
        <AppProviders>
          <WebVitalsReporter />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
