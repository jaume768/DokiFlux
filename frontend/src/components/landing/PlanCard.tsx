import Link from "next/link";

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
  const accentColor = highlighted ? "#8b5cf6" : "rgba(255,255,255,0.15)";
  const accentColorHex = highlighted ? "139,92,246" : "255,255,255";

  return (
    <div
      className="relative flex flex-col rounded-2xl p-6 transition-all duration-300"
      style={{
        background: highlighted
          ? "radial-gradient(ellipse at top left, rgba(139,92,246,0.12) 0%, rgba(10,10,20,0.9) 60%)"
          : "rgba(255,255,255,0.025)",
        border: `1px solid ${highlighted ? "rgba(139,92,246,0.40)" : "rgba(255,255,255,0.07)"}`,
        boxShadow: highlighted ? "0 0 40px rgba(139,92,246,0.14), inset 0 0 40px rgba(139,92,246,0.04)" : "none",
      }}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span
            className="px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)", color: "#fff" }}
          >
            {badge}
          </span>
        </div>
      )}

      <div className="mb-5">
        <h3 className="text-base font-bold text-white">{name}</h3>
        <p className="mt-1 text-sm text-white/45">{description}</p>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-bold text-white">{price}</span>
        {period && (
          <span className="text-sm text-white/40 ml-1">{period}</span>
        )}
      </div>

      <ul className="mb-8 flex-1 space-y-2.5">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm">
            <span
              className="mt-0.5 h-4 w-4 shrink-0 rounded-full flex items-center justify-center text-[10px]"
              style={{ background: `rgba(${accentColorHex},0.15)`, color: highlighted ? "#c084fc" : "rgba(255,255,255,0.6)" }}
            >
              ✓
            </span>
            <span className="text-white/70">{feature}</span>
          </li>
        ))}
      </ul>

      {disabled ? (
        <span
          className="w-full text-center py-2.5 rounded-xl text-sm font-semibold cursor-not-allowed"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}
        >
          {cta}
        </span>
      ) : highlighted ? (
        <Link
          href={ctaHref}
          className="btn-primary w-full text-center py-2.5 rounded-xl text-sm font-semibold text-white block"
        >
          {cta}
        </Link>
      ) : (
        <Link
          href={ctaHref}
          className="w-full text-center py-2.5 rounded-xl text-sm font-semibold block transition-all duration-200 hover:bg-white/10"
          style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)" }}
        >
          {cta}
        </Link>
      )}
    </div>
  );
}
