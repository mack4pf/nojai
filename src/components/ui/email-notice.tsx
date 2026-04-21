import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Mail, AlertTriangle } from "lucide-react";

type Variant = "sent" | "pending" | "warning" | "verified";

interface EmailNoticeProps {
  variant?: Variant;
  message: string;
  className?: string;
}

const STYLES: Record<Variant, { icon: React.ReactNode; classes: string }> = {
  sent: {
    icon: <Mail className="h-3.5 w-3.5 shrink-0 text-sky-400" />,
    classes: "border-sky-500/20 bg-sky-500/[0.07] text-sky-300",
  },
  pending: {
    icon: <Clock className="h-3.5 w-3.5 shrink-0 text-amber-400" />,
    classes: "border-amber-500/20 bg-amber-500/[0.07] text-amber-300",
  },
  warning: {
    icon: <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />,
    classes: "border-amber-500/20 bg-amber-500/[0.07] text-amber-300",
  },
  verified: {
    icon: <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />,
    classes: "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300",
  },
};

export function EmailNotice({ variant = "sent", message, className }: EmailNoticeProps) {
  const { icon, classes } = STYLES[variant];
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed",
        classes,
        className,
      )}
    >
      {icon}
      <span>{message}</span>
    </div>
  );
}
