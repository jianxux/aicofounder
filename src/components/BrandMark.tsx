type BrandMarkProps = {
  className?: string;
  title?: string;
};

export default function BrandMark({ className, title = "AI Cofounder logo" }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={title}
      role="img"
    >
      <title>{title}</title>
      <rect x="2" y="2" width="60" height="60" rx="18" fill="url(#brand-bg)" />
      <rect x="2" y="2" width="60" height="60" rx="18" stroke="#FFFFFF" strokeOpacity="0.08" strokeWidth="1.5" />
      <path d="M17 47L29 18L41 47" stroke="#F7F3ED" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22.5 34H35.5" stroke="#F7F3ED" strokeWidth="7" strokeLinecap="round" />
      <rect x="45" y="19" width="6" height="26" rx="3" fill="url(#brand-accent)" />
      <defs>
        <linearGradient id="brand-bg" x1="10" y1="8" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#18181B" />
          <stop offset="1" stopColor="#09090B" />
        </linearGradient>
        <linearGradient id="brand-accent" x1="45" y1="19" x2="51" y2="45" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E8C58B" />
          <stop offset="1" stopColor="#C89A56" />
        </linearGradient>
      </defs>
    </svg>
  );
}
