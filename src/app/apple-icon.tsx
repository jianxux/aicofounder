import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#111827",
          borderRadius: 36,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(251,191,36,0.2), rgba(52,211,153,0.14) 60%, rgba(17,24,39,0))",
          }}
        />
        <svg width="124" height="124" viewBox="0 0 64 64" fill="none">
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
          <path d="M28 46L34.5 22L40 31H48L35 46H28Z" fill="url(#core)" />
          <circle cx="19" cy="42" r="5.5" fill="#F8FAFC" />
          <circle cx="45" cy="18" r="5.5" fill="#FBBF24" />
          <circle cx="45" cy="42" r="5.5" fill="#34D399" />
          <defs>
            <linearGradient id="core" x1="28" y1="46" x2="46" y2="20" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FB7185" />
              <stop offset="1" stopColor="#FBBF24" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    ),
    size,
  );
}
