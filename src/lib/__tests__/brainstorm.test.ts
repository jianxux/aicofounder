import { describe, expect, it } from "vitest";

import { buildBrainstormPrompt, parseBrainstormResponse } from "@/lib/brainstorm";

describe("brainstorm helpers", () => {
  it("builds a prompt with project details and source guidance", () => {
    const prompt = buildBrainstormPrompt("Orbit", "AI workspace for startup research", "Discovery");

    expect(prompt).toContain("Project name: Orbit.");
    expect(prompt).toContain("Project description: AI workspace for startup research.");
    expect(prompt).toContain("Focus area: Discovery.");
    expect(prompt).toContain("Reddit threads, Hacker News discussions, Product Hunt comments, Twitter/X posts, and niche forums");
    expect(prompt).toContain("r/startups");
  });

  it("parses a valid JSON response", () => {
    const result = parseBrainstormResponse(`{
      "painPoints": [
        {
          "id": "pp-1",
          "title": "Fragmented research",
          "description": "Founders keep context spread across tools.",
          "source": "r/startups",
          "severity": 4,
          "frequency": "daily",
          "quotes": ["I lose track of feedback constantly.", "Everything is split across docs and chats."]
        }
      ],
      "summary": "Research context is fragmented.",
      "searchContext": "Reviewed r/startups and Indie Hackers threads."
    }`);

    expect(result).toEqual({
      painPoints: [
        {
          id: "pp-1",
          title: "Fragmented research",
          description: "Founders keep context spread across tools.",
          source: "r/startups",
          severity: 4,
          frequency: "daily",
          quotes: ["I lose track of feedback constantly.", "Everything is split across docs and chats."],
        },
      ],
      summary: "Research context is fragmented.",
      searchContext: "Reviewed r/startups and Indie Hackers threads.",
    });
  });

  it("parses JSON wrapped in a markdown code block", () => {
    const result = parseBrainstormResponse(`\`\`\`json
{
  "painPoints": [],
  "summary": "No issues found.",
  "searchContext": "Checked Product Hunt."
}
\`\`\``);

    expect(result).toEqual({
      painPoints: [],
      summary: "No issues found.",
      searchContext: "Checked Product Hunt.",
    });
  });

  it("returns null for invalid JSON", () => {
    expect(parseBrainstormResponse("not json")).toBeNull();
  });

  it("returns null for JSON that does not match the expected shape", () => {
    expect(
      parseBrainstormResponse(`{
        "painPoints": [
          {
            "id": "pp-1",
            "title": "Missing fields"
          }
        ],
        "summary": "bad",
        "searchContext": "bad"
      }`),
    ).toBeNull();
  });
});
