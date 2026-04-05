type BrandGlyphProps = {
  className?: string;
  height?: number | string;
  title?: string;
  width?: number | string;
  withBackground?: boolean;
};

export default function BrandGlyph({
  className,
  height,
  title,
  width,
  withBackground = false,
}: BrandGlyphProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={width}
      height={height}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      role={title ? "img" : "presentation"}
    >
      {title ? <title>{title}</title> : null}
      {withBackground ? (
        <>
          <rect x="2" y="2" width="60" height="60" rx="18" fill="#111111" />
          <circle cx="18" cy="16" r="18" fill="#E8C58B" opacity="0.1" />
          <circle cx="48" cy="52" r="14" fill="#FFFFFF" opacity="0.04" />
          <rect x="2" y="2" width="60" height="60" rx="18" stroke="#FFFFFF" strokeOpacity="0.08" strokeWidth="1.5" />
        </>
      ) : null}
      <path
        d="M32 12C27.2 12 23.4 12.9 20.3 15.1C16.3 18 14 22.7 14 27.2C14 29 14.4 30.8 15 32.4C14.3 34 14 35.9 14 37.8C14 45.6 20.2 52 28 52H32V12Z"
        fill="#F7F3ED"
      />
      <path
        d="M32 12H38.8C44.7 12 49 16.4 49 22.2V41.8C49 47.6 44.7 52 38.8 52H32V12Z"
        fill="#D6A260"
      />
      <path
        d="M25.2 18.8C22.7 20.1 21.1 22.8 21.1 25.9C21.1 28.1 21.8 30 23.1 31.5"
        stroke="#111111"
        strokeOpacity="0.24"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M28.6 20.8C27.1 22 26.1 23.9 26.1 26C26.1 27.8 26.8 29.5 28 30.8C27.1 31.9 26.6 33.3 26.6 35C26.6 37.3 27.7 39.3 29.4 40.8"
        stroke="#111111"
        strokeOpacity="0.24"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M20.5 35.1C20.5 37.5 21.5 39.7 23.2 41.1C24.6 42.3 26.2 42.9 28.1 42.9"
        stroke="#111111"
        strokeOpacity="0.24"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path d="M36 21H42.5" stroke="#F7F3ED" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M36 31.8H44" stroke="#F7F3ED" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M36 42.6H40.8" stroke="#F7F3ED" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="45.2" cy="21" r="2.6" fill="#F7F3ED" />
      <circle cx="46.5" cy="31.8" r="2.6" fill="#F7F3ED" />
      <circle cx="42.9" cy="42.6" r="2.6" fill="#F7F3ED" />
    </svg>
  );
}
