import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface BrandLogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
  priority?: boolean;
}

const sizeStyles = {
  sm: {
    image: "h-10 w-10 rounded-xl",
    text: "text-base",
    gap: "gap-2.5",
  },
  md: {
    image: "h-12 w-12 rounded-2xl",
    text: "text-lg",
    gap: "gap-3",
  },
  lg: {
    image: "h-16 w-16 rounded-[1.25rem]",
    text: "text-2xl",
    gap: "gap-4",
  },
} as const;

export function BrandLogo({
  href = "/",
  size = "md",
  showWordmark = true,
  className,
  priority = false,
}: BrandLogoProps) {
  const styles = sizeStyles[size];

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center font-display font-semibold tracking-tight text-foreground transition-opacity hover:opacity-90",
        styles.gap,
        className,
      )}
    >
      <span className={cn("relative block overflow-hidden bg-[#0b1020] shadow-glow", styles.image)}>
        <Image
          src="/logo.jpg"
          alt="NOJAI"
          fill
          sizes={size === "lg" ? "64px" : size === "md" ? "48px" : "40px"}
          className="object-cover"
          priority={priority}
        />
      </span>
      {showWordmark ? <span className={cn(styles.text)}>NOJAI</span> : null}
    </Link>
  );
}