import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(circle at top left, rgba(251,191,36,0.18), rgba(17,24,39,0) 36%), linear-gradient(135deg, #0f172a 0%, #111827 52%, #1f2937 100%)",
          color: "#F8FAFC",
          padding: "56px",
          position: "relative",
          overflow: "hidden",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: "-80px",
            top: "-90px",
            width: "320px",
            height: "320px",
            borderRadius: "999px",
            background: "rgba(52,211,153,0.12)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50px",
            bottom: "-140px",
            width: "420px",
            height: "420px",
            borderRadius: "999px",
            background: "rgba(251,113,133,0.12)",
          }}
        />
        <div
          style={{
            display: "flex",
            flex: 1,
            borderRadius: "32px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
            padding: "52px",
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
              <div
                style={{
                  display: "flex",
                  width: "116px",
                  height: "116px",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "32px",
                  background: "#111827",
                  boxShadow: "0 24px 50px rgba(15,23,42,0.3)",
                }}
              >
                <svg width="84" height="84" viewBox="0 0 64 64" fill="none">
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
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ fontSize: "24px", letterSpacing: "0.28em", textTransform: "uppercase", color: "#CBD5E1" }}>
                  AI Cofounder
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    borderRadius: "999px",
                    padding: "10px 16px",
                    background: "rgba(248,250,252,0.08)",
                    color: "#E2E8F0",
                    fontSize: "20px",
                  }}
                >
                  Opinionated product thinking for founders
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "760px" }}>
              <div style={{ fontSize: "78px", lineHeight: 1.02, fontWeight: 700 }}>
                Make something people actually want
              </div>
              <div style={{ fontSize: "32px", lineHeight: 1.3, color: "#CBD5E1" }}>
                Research demand, sharpen your product strategy, and move from idea to launch with an AI partner that
                challenges weak assumptions.
              </div>
            </div>
            <div style={{ display: "flex", gap: "18px", color: "#E2E8F0", fontSize: "22px" }}>
              <div
                style={{
                  display: "flex",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.18)",
                  padding: "12px 18px",
                }}
              >
                Research
              </div>
              <div
                style={{
                  display: "flex",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.18)",
                  padding: "12px 18px",
                }}
              >
                Strategy
              </div>
              <div
                style={{
                  display: "flex",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.18)",
                  padding: "12px 18px",
                }}
              >
                Launch
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
