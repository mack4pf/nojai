import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-20 text-foreground">
      <div className="max-w-xl text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-primary">404</p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          This page could not be found.
        </h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Head back to the homepage and continue setting up your NOJAI account.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Return home
        </Link>
      </div>
    </main>
  );
}