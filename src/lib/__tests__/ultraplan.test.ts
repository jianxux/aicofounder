import { describe, expect, it } from "vitest";

import { buildUltraplanPrompt, parseUltraplanResponse } from "@/lib/ultraplan";

describe("ultraplan helpers", () => {
  it("builds a prompt with project details and blocker guidance", () => {
    const prompt = buildUltraplanPrompt(
      "Orbit",
      "AI workspace for startup research",
      "Execution",
      4,
      10,
      ["Need clearer ICP", "Shipping has stalled"],
    );

    expect(prompt).toContain("Project name: Orbit.");
    expect(prompt).toContain("Project description: AI workspace for startup research.");
    expect(prompt).toContain("Current phase: Execution.");
    expect(prompt).toContain("Completed tasks: 4.");
    expect(prompt).toContain("Total tasks: 10.");
    expect(prompt).toContain("Recent messages: Need clearer ICP | Shipping has stalled.");
    expect(prompt).toContain("single biggest blocker");
    expect(prompt).toContain("3 to 5 concrete, actionable steps");
  });

  it("parses a valid JSON response", () => {
    const result = parseUltraplanResponse(`{
      "blocker": {
        "id": "blocker-1",
        "title": "Unclear customer segment",
        "description": "The team is building without a validated target user.",
        "severity": 5,
        "category": "market"
      },
      "actions": [
        {
          "id": "action-1",
          "title": "Interview five users",
          "description": "Run short calls with likely buyers this week.",
          "effort": "medium",
          "impact": "high",
          "timelineHours": 6
        },
        {
          "id": "action-2",
          "title": "Rewrite positioning",
          "description": "Draft a sharper ICP and value prop statement.",
          "effort": "low",
          "impact": "high",
          "timelineHours": 3
        },
        {
          "id": "action-3",
          "title": "Gate roadmap decisions",
          "description": "Pause new feature work until interview patterns are reviewed.",
          "effort": "low",
          "impact": "medium",
          "timelineHours": 1
        }
      ],
      "rationale": "Without a clear segment, execution risk compounds across product and messaging.",
      "nextStep": "Schedule the first two customer interviews today."
    }`);

    expect(result).toEqual({
      blocker: {
        id: "blocker-1",
        title: "Unclear customer segment",
        description: "The team is building without a validated target user.",
        severity: 5,
        category: "market",
      },
      actions: [
        {
          id: "action-1",
          title: "Interview five users",
          description: "Run short calls with likely buyers this week.",
          effort: "medium",
          impact: "high",
          timelineHours: 6,
        },
        {
          id: "action-2",
          title: "Rewrite positioning",
          description: "Draft a sharper ICP and value prop statement.",
          effort: "low",
          impact: "high",
          timelineHours: 3,
        },
        {
          id: "action-3",
          title: "Gate roadmap decisions",
          description: "Pause new feature work until interview patterns are reviewed.",
          effort: "low",
          impact: "medium",
          timelineHours: 1,
        },
      ],
      rationale: "Without a clear segment, execution risk compounds across product and messaging.",
      nextStep: "Schedule the first two customer interviews today.",
    });
  });

  it("parses JSON wrapped in a markdown code block", () => {
    const result = parseUltraplanResponse(`\`\`\`json
{
  "blocker": {
    "id": "blocker-1",
    "title": "Waiting on integrations",
    "description": "Core workflow depends on an unfinished API integration.",
    "severity": 4,
    "category": "technical"
  },
  "actions": [
    {
      "id": "action-1",
      "title": "Mock the API",
      "description": "Replace the dependency with a temporary stub.",
      "effort": "medium",
      "impact": "high",
      "timelineHours": 4
    },
    {
      "id": "action-2",
      "title": "Split the milestone",
      "description": "Ship the non-integration path first.",
      "effort": "low",
      "impact": "medium",
      "timelineHours": 2
    },
    {
      "id": "action-3",
      "title": "Clarify owner",
      "description": "Assign one engineer to close the dependency.",
      "effort": "low",
      "impact": "medium",
      "timelineHours": 1
    }
  ],
  "rationale": "The dependency is blocking visible product progress.",
  "nextStep": "Implement the mock API layer."
}
\`\`\``);

    expect(result).toEqual({
      blocker: {
        id: "blocker-1",
        title: "Waiting on integrations",
        description: "Core workflow depends on an unfinished API integration.",
        severity: 4,
        category: "technical",
      },
      actions: [
        {
          id: "action-1",
          title: "Mock the API",
          description: "Replace the dependency with a temporary stub.",
          effort: "medium",
          impact: "high",
          timelineHours: 4,
        },
        {
          id: "action-2",
          title: "Split the milestone",
          description: "Ship the non-integration path first.",
          effort: "low",
          impact: "medium",
          timelineHours: 2,
        },
        {
          id: "action-3",
          title: "Clarify owner",
          description: "Assign one engineer to close the dependency.",
          effort: "low",
          impact: "medium",
          timelineHours: 1,
        },
      ],
      rationale: "The dependency is blocking visible product progress.",
      nextStep: "Implement the mock API layer.",
    });
  });

  it("returns null for invalid JSON", () => {
    expect(parseUltraplanResponse("not json")).toBeNull();
  });

  it("returns null for JSON that does not match the expected shape", () => {
    expect(
      parseUltraplanResponse(`{
        "blocker": {
          "id": "blocker-1",
          "title": "Missing fields"
        },
        "actions": [],
        "rationale": "bad",
        "nextStep": "bad"
      }`),
    ).toBeNull();
  });
});
