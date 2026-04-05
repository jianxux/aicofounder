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
      <rect x="2" y="2" width="60" height="60" rx="18" fill="#111827" />
      <rect x="2" y="2" width="60" height="60" rx="18" stroke="url(#brand-stroke)" strokeWidth="2" />
      <path
        d="M19 42L31.5 28.5L45 18"
        stroke="#F8FAFC"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M31.5 28.5L45 42"
        stroke="#CFFAFE"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28 46L34.5 22L40 31H48L35 46H28Z"
        fill="url(#brand-core)"
      />
      <circle cx="19" cy="42" r="5.5" fill="#F8FAFC" />
      <circle cx="45" cy="18" r="5.5" fill="#FBBF24" />
      <circle cx="45" cy="42" r="5.5" fill="#34D399" />
      <defs>
        <linearGradient id="brand-core" x1="28" y1="46" x2="46" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FB7185" />
          <stop offset="1" stopColor="#FBBF24" />
        </linearGradient>
        <linearGradient id="brand-stroke" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" stopOpacity="0.45" />
          <stop offset="1" stopColor="#34D399" stopOpacity="0.35" />
        </linearGradient>
      </defs>
    </svg>
  );
}
