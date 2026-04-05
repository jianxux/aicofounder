import { ImageResponse } from "next/og";
import BrandGlyph from "@/components/BrandGlyph";

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
            "radial-gradient(circle at top left, rgba(232,197,139,0.18), rgba(24,24,27,0) 34%), linear-gradient(140deg, #111111 0%, #1c1917 58%, #292524 100%)",
          color: "#F7F3ED",
          padding: "54px",
          position: "relative",
          overflow: "hidden",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: "-120px",
            top: "-80px",
            width: "420px",
            height: "420px",
            borderRadius: "999px",
            background: "rgba(231,229,228,0.05)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "-40px",
            bottom: "-170px",
            width: "460px",
            height: "460px",
            borderRadius: "999px",
            background: "rgba(232,197,139,0.08)",
          }}
        />
        <div
          style={{
            display: "flex",
            flex: 1,
            borderRadius: "36px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
            padding: "54px",
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
                  borderRadius: "30px",
                  background: "linear-gradient(145deg, #18181b 0%, #09090b 100%)",
                  boxShadow: "0 24px 50px rgba(15,23,42,0.3)",
                }}
              >
                <BrandGlyph width={84} height={84} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ fontSize: "26px", fontWeight: 600, letterSpacing: "-0.03em", color: "#F5F5F4" }}>
                  AI Cofounder
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    borderRadius: "999px",
                    padding: "10px 16px",
                    background: "rgba(245,245,244,0.08)",
                    color: "#D6D3D1",
                    fontSize: "20px",
                  }}
                >
                  An AI partner for deliberate founders
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "760px" }}>
              <div style={{ fontSize: "78px", lineHeight: 1.02, fontWeight: 700 }}>
                Make something people actually want
              </div>
              <div style={{ fontSize: "32px", lineHeight: 1.3, color: "#D6D3D1" }}>
                Research demand, sharpen your product strategy, and move from idea to launch with an AI partner that
                challenges weak assumptions.
              </div>
            </div>
            <div style={{ display: "flex", gap: "18px", color: "#E7E5E4", fontSize: "22px" }}>
              <div
                style={{
                  display: "flex",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.14)",
                  padding: "12px 18px",
                }}
              >
                Research
              </div>
              <div
                style={{
                  display: "flex",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.14)",
                  padding: "12px 18px",
                }}
              >
                Strategy
              </div>
              <div
                style={{
                  display: "flex",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.14)",
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
