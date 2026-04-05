import { ImageResponse } from "next/og";
import BrandGlyph from "@/components/BrandGlyph";

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
        <BrandGlyph width={124} height={124} />
      </div>
    ),
    size,
  );
}
