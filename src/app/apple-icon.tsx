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
          background: "linear-gradient(145deg, #18181b 0%, #09090b 100%)",
          borderRadius: 36,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(232,197,139,0.18), rgba(9,9,11,0) 58%)",
          }}
        />
        <svg width="124" height="124" viewBox="0 0 64 64" fill="none">
          <path d="M17 47L29 18L41 47" stroke="#F7F3ED" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22.5 34H35.5" stroke="#F7F3ED" strokeWidth="7" strokeLinecap="round" />
          <rect x="45" y="19" width="6" height="26" rx="3" fill="url(#accent)" />
          <defs>
            <linearGradient id="accent" x1="45" y1="19" x2="51" y2="45" gradientUnits="userSpaceOnUse">
              <stop stopColor="#E8C58B" />
              <stop offset="1" stopColor="#C89A56" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    ),
    size,
  );
}
