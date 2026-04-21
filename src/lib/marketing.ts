export const howItWorks = [
  {
    step: "01",
    title: "Link your broker",
    description:
      "Once you create your account, choose your broker and connect it from the dashboard to get started.",
  },
  {
    step: "02",
    title: "Set your signal and amount",
    description:
      "Choose how much you want to trade with, apply your bot settings, and get ready for automation.",
  },
  {
    step: "03",
    title: "Automate",
    description:
      "After setup, NOJAI trades for you and updates your dashboard in real time.",
  },
];

export const featureList = [
  {
    title: "Automated trading 24/7",
    description: "Trade day and night without staying online all the time, with support around the bot whenever you need help.",
  },
  {
    title: "Set your amount",
    description: "Choose how much you want the bot to trade with before you start.",
  },
  {
    title: "Built for beginners",
    description: "The setup is simple from start to finish.",
  },
  {
    title: "Live dashboard",
    description: "Track balances, trades, and plan status in one place.",
  },
  {
    title: "Signals on every plan",
    description: "Signals are included across Standard, Pro, and VIP.",
  },
  {
    title: "Simple upgrade path",
    description: "Start with Standard, move to Pro for copy trading, or go VIP for TradingView strategy access and more bot power.",
  },
];

export const publicPricingPlans = [
  {
    _id: "standard-public",
    name: "Standard",
    slug: "standard",
    tier: "STANDARD",
    price: 30,
    currency: "",
    durationInDays: 30,
    isPopular: false,
    features: [
      "Bot subscription for 1 month",
      "Signals included",
      "24/7 support about the bot",
    ],
  },
  {
    _id: "pro-public",
    name: "Pro",
    slug: "pro",
    tier: "PRO",
    price: 50,
    currency: "",
    durationInDays: 30,
    isPopular: true,
    features: [
      "Bot subscription for 1 month",
      "Copy trading access",
      "Signals included",
      "24/7 support about the bot",
    ],
  },
  {
    _id: "vip-public",
    name: "VIP",
    slug: "vip",
    tier: "VIP",
    price: 75,
    currency: "",
    durationInDays: 30,
    isPopular: false,
    features: [
      "Add your own TradingView strategy",
      "Learn how to create strategy access",
      "Access to both the Pro bot and VIP bot",
      "Boost trades",
      "Signals included",
      "24/7 support about the bot",
    ],
  },
] as const;

export const academyLink = "https://t.me/c/2363578289/5771";

export const brokerSupport = [
  {
    name: "IQ Option",
    status: "Live now",
    description: "Connect your IQ Option account and start automation today.",
  },
  {
    name: "Pocket Option",
    status: "Coming soon",
    description: "Pocket Option support is on the way.",
  },
  {
    name: "Expert Option",
    status: "Coming soon",
    description: "Expert Option support is coming soon.",
  },
  {
    name: "Crypto Trading",
    status: "Coming soon",
    description: "Crypto trading automation is coming soon.",
  },
  {
    name: "Stock and Forex Brokers",
    status: "Coming soon",
    description: "Stock and forex brokers are planned next.",
  },
  {
    name: "MT5",
    status: "Coming soon",
    description: "MT5 support is also coming soon.",
  },
];

export const aboutHighlights = [
  "Trade automatically 24/7.",
  "Simple setup for beginners.",
  "Choose how much you want to trade with.",
  "Track everything from one dashboard.",
];

export const workflowStages = [
  {
    step: "1",
    title: "TradingView Signal",
    brand: "TradingView",
    subtitle: "Indicators, strategy, and trade alert",
    accent: "Signal",
    logo: "/autobot-assets/tradingview.svg",
    preview: "/autobot-assets/app-hero.svg",
    points: [
      "Your TradingView strategy tracks the market and creates the signal.",
      "Trade alerts are sent straight to NOJAI.",
      "VIP users can use their own TradingView setup here.",
    ],
  },
  {
    step: "2",
    title: "NOJAI AI Analysis",
    brand: "NOJAI",
    subtitle: "Signal interpretation, volatility check, and risk management",
    accent: "AI",
    logo: "/logo.jpg",
    preview: "/autobot-assets/app-hero.svg",
    points: [
      "NOJAI reads the alert and checks the setup.",
      "Risk rules and execution checks run before a trade is placed.",
      "The dashboard stays updated with account, balance, and bot status.",
    ],
  },
  {
    step: "3",
    title: "IQ Option Execution",
    brand: "IQ Option",
    subtitle: "Order execution and portfolio outcome",
    accent: "Execution",
    logo: "/autobot-assets/iq-option.svg",
    preview: "/autobot-assets/app-hero.svg",
    points: [
      "Orders are sent to the connected IQ Option account in the selected mode.",
      "Trade results come back into NOJAI and show in the dashboard.",
      "VIP users can run this across multiple connected IQ Option accounts.",
    ],
  },
] as const;

export const freeVideoResources = [
  {
    title: "IQ Option Free Course Beginners (Complete Tutorial)",
    description: "A full walkthrough for getting started with IQ Option before using automation.",
    href: "https://youtu.be/zvIj5Jy6_w4",
    youtubeId: "zvIj5Jy6_w4",
    badge: "Free Course",
    badgeClassName: "bg-primary/15 text-primary",
  },
  {
    title: "Auto Trader for IQ Option | WIN!!!!",
    description: "A quick video showing the free script setup for IQ Option.",
    href: "https://youtu.be/tePDDjJnMuM",
    youtubeId: "tePDDjJnMuM",
    badge: "Free Script",
    badgeClassName: "bg-sky-500/15 text-sky-400",
  },
] as const;

export const contactChannels = [
  {
    title: "Customer support",
    value: "support@nojai.app",
    description: "General questions, account help, and billing assistance.",
    href: "mailto:support@nojai.app",
  },
  {
    title: "Founder contact",
    value: "Nathaniel Onoja",
    description: "Read more about the founder and the project.",
    href: "/about",
  },
  {
    title: "VIP onboarding",
    value: "Setup assistance",
    description: "Guidance for connecting accounts and preparing advanced bot access.",
    href: "/auth/register",
  },
];

export const faqItems = [
  {
    question: "Do I need trading experience before I start?",
    answer:
      "No. NOJAI is built for beginners too. You can connect your account, set your amount, and let the bot do the work.",
  },
  {
    question: "How do the bots help me make money online?",
    answer:
      "The bot handles the trading for you based on your setup so you do not need to stay on charts all day.",
  },
  {
    question: "Can I manage more than one trading account?",
    answer:
      "Yes. You can manage your trading accounts from your dashboard.",
  },
  {
    question: "What beginner discount are you offering right now?",
    answer:
      "Registration is free. Current launch pricing is shown directly on the pricing cards so each plan can display the correct live amount and currency.",
  },
];