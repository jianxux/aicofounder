import { describe, expect, it } from "vitest";

import { metadata } from "@/app/layout";
import { contentType as openGraphContentType, size as openGraphSize } from "@/app/opengraph-image";
import { contentType as twitterContentType, size as twitterSize } from "@/app/twitter-image";

describe("app metadata previews", () => {
  it("uses concrete conversion-oriented social metadata copy", () => {
    expect(metadata.title).toBe("AI Cofounder — Score demand, prove customer pull, ship the next move");
    expect(metadata.description).toContain("proof artifacts");
    expect(metadata.description).toContain("idea scoring");
    expect(metadata.description).toContain("next-step plan");

    expect(metadata.openGraph?.title).toBe("AI Cofounder — Score demand, prove customer pull, ship the next move");
    expect(metadata.openGraph?.description).toContain("idea scorecards");
    expect(metadata.openGraph?.description).toContain("customer evidence");
    expect(metadata.openGraph?.description).toContain("prioritized next-step plan");

    expect(metadata.twitter?.title).toBe("AI Cofounder — Score demand, prove customer pull, ship the next move");
    expect(metadata.twitter?.description).toContain("Idea scorecard");
    expect(metadata.twitter?.description).toContain("customer feedback synthesis");
    expect(metadata.twitter?.description).toContain("next-step execution plan");
    expect(metadata.twitter?.images).toEqual(["/twitter-image"]);

    const keywords = Array.isArray(metadata.keywords)
      ? metadata.keywords
      : typeof metadata.keywords === "string"
        ? [metadata.keywords]
        : [];

    expect(keywords).toEqual(expect.arrayContaining(["demand validation", "positioning"]));
    expect(keywords).not.toEqual(expect.arrayContaining(["business plan", "forecast", "pitch deck prep"]));
  });

  it("exports stable OG and Twitter image metadata", () => {
    expect(openGraphSize).toEqual({ width: 1200, height: 630 });
    expect(twitterSize).toEqual({ width: 1200, height: 630 });
    expect(openGraphContentType).toBe("image/png");
    expect(twitterContentType).toBe("image/png");
  });
});
