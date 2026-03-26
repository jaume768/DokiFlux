import Link from "next/link";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlighted?: boolean;
  badge?: string;
  disabled?: boolean;
}

export function PlanCard({
  name,
  price,
  period = "/mes",
  description,
  features,
  cta,
  ctaHref,
  highlighted = false,
  badge,
  disabled = false,
}: PlanCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-6 transition-all",
        highlighted
          ? "border-primary bg-card shadow-lg ring-1 ring-primary/20"
          : "border-border bg-card hover:shadow-md"
      )}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge>{badge}</Badge>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold">{name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-bold">{price}</span>
        {period && (
          <span className="text-sm text-muted-foreground">{period}</span>
        )}
      </div>

      <ul className="mb-8 flex-1 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {disabled ? (
        <span
          className={cn(
            buttonVariants({ variant: highlighted ? "default" : "outline" }),
            "w-full cursor-not-allowed opacity-60"
          )}
        >
          {cta}
        </span>
      ) : (
        <Link
          href={ctaHref}
          className={cn(
            buttonVariants({ variant: highlighted ? "default" : "outline" }),
            "w-full"
          )}
        >
          {cta}
        </Link>
      )}
    </div>
  );
}
