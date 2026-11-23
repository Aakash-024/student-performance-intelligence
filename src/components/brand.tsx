import type { ReactNode } from "react";

/**
 * ACADNEX brand mark.
 *
 * The ascending bars and rising data line express academic progression and
 * intelligence. Kept as inline SVG so it stays crisp at every size, works on
 * dark and light surfaces, and can be reused in the PDF layout code path.
 */

export const BRAND = {
  name: "ACADNEX",
  fullName: "Academic Performance Intelligence Platform",
  category: "Academic Intelligence & Analytics",
  tagline: "Academic Intelligence. Elevated.",
} as const;

export const BRAND_COLORS = {
  midnight: "#080D1B",
  navy: "#0D1426",
  blue: "#2563EB",
  cyan: "#22D3EE",
  white: "#F1F5F9",
  slate: "#94A3B8",
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
} as const;

export function BrandMark({
  size = 36,
  className = "",
  title,
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      <rect width="64" height="64" rx="14" fill={BRAND_COLORS.navy} />
      <rect
        x="0.75"
        y="0.75"
        width="62.5"
        height="62.5"
        rx="13.25"
        fill="none"
        stroke={BRAND_COLORS.blue}
        strokeOpacity="0.45"
        strokeWidth="1.5"
      />
      <rect x="13" y="36" width="8" height="15" rx="2.5" fill={BRAND_COLORS.blue} />
      <rect x="27" y="28" width="8" height="23" rx="2.5" fill={BRAND_COLORS.blue} />
      <rect x="41" y="18" width="8" height="33" rx="2.5" fill={BRAND_COLORS.cyan} />
      <path
        d="M14 41 L28 31 L43 21 L52 10"
        fill="none"
        stroke={BRAND_COLORS.cyan}
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="28" cy="31" r="2.6" fill={BRAND_COLORS.white} />
      <circle cx="52" cy="10" r="3.6" fill={BRAND_COLORS.cyan} />
    </svg>
  );
}

export function BrandLogo({
  size = 36,
  showTagline = true,
  className = "",
  title,
}: {
  size?: number;
  showTagline?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <BrandMark size={size} title={title} />
      <span className="flex min-w-0 flex-col leading-none">
        <span className="text-[1.02rem] font-bold tracking-[0.18em] text-[var(--brand-text)]">
          {BRAND.name}
        </span>
        {showTagline ? (
          <span className="mt-1.5 text-[10px] font-medium tracking-[0.13em] text-[var(--brand-accent)]">
            {BRAND.tagline}
          </span>
        ) : null}
      </span>
    </span>
  );
}

/** Small section heading used on marketing/auth surfaces. */
export function BrandEyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--brand-accent)]">
      <span className="h-px w-4 bg-[var(--brand-accent)]" />
      {children}
    </span>
  );
}
