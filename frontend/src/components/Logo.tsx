type LogoProps = {
  size?: number;
  className?: string;
};

// Four-pointed star centred on (20, 20); `r` is the tip radius, `w` the waist.
function star(r: number, w: number) {
  const c = 20;
  return `M${c} ${c - r} L${c + w} ${c - w} L${c + r} ${c} L${c + w} ${c + w} L${c} ${c + r} L${c - w} ${c + w} L${c - r} ${c} L${c - w} ${c - w} Z`;
}

/**
 * ARPO seal: a terracotta roundel with an eight-point compass star, drawn
 * like a rangoli/jaali motif. Colours come from the theme tokens.
 */
export default function Logo({ size = 36, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="20" cy="20" r="19.5" fill="var(--accent)" />
      <circle
        cx="20"
        cy="20"
        r="16.4"
        stroke="var(--accent-ink)"
        strokeOpacity="0.55"
        strokeWidth="0.8"
      />
      <circle
        cx="20"
        cy="20"
        r="14.6"
        stroke="var(--accent-ink)"
        strokeOpacity="0.3"
        strokeWidth="0.6"
        strokeDasharray="0.9 1.6"
      />
      <path
        d={star(9.2, 2.6)}
        transform="rotate(45 20 20)"
        fill="var(--accent-ink)"
        fillOpacity="0.5"
      />
      <path d={star(12, 2.6)} fill="var(--accent-ink)" />
      <circle cx="20" cy="20" r="2.1" fill="var(--accent)" />
      <circle cx="20" cy="20" r="0.9" fill="var(--accent-ink)" />
    </svg>
  );
}
