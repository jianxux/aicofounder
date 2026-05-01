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

  it("falls back to default prompt values when optional inputs are blank", () => {
    const prompt = buildUltraplanPrompt("   ", "Trimmed description", "   ", 0, 3, ["  ", "Need clarity  "]);

    expect(prompt).toContain("Project name: Untitled project.");
    expect(prompt).toContain("Current phase: Unknown phase.");
    expect(prompt).toContain("Recent messages: Need clarity.");
  });

  it("uses the no recent messages fallback when messages are absent", () => {
    const prompt = buildUltraplanPrompt("Orbit", "AI workspace", "Research", 1, 5);

    expect(prompt).toContain("Recent messages: none provided.");
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

  it("returns null when blocker or action enums are invalid", () => {
    expect(
      parseUltraplanResponse(`{
        "blocker": {
          "id": "blocker-1",
          "title": "Bad blocker",
          "description": "Invalid severity",
          "severity": 6,
          "category": "market"
        },
        "actions": [
          {
            "id": "action-1",
            "title": "Action",
            "description": "Bad timeline",
            "effort": "medium",
            "impact": "high",
            "timelineHours": "4"
          },
          {
            "id": "action-2",
            "title": "Action 2",
            "description": "Valid action",
            "effort": "low",
            "impact": "medium",
            "timelineHours": 1
          },
          {
            "id": "action-3",
            "title": "Action 3",
            "description": "Valid action",
            "effort": "low",
            "impact": "medium",
            "timelineHours": 2
          }
        ],
        "rationale": "bad",
        "nextStep": "bad"
      }`),
    ).toBeNull();
  });

  it("returns null when an action has zero timelineHours", () => {
    expect(
      parseUltraplanResponse(`{
        "blocker": {
          "id": "blocker-1",
          "title": "Zero timeline",
          "description": "Action timeline must be positive.",
          "severity": 3,
          "category": "resource"
        },
        "actions": [
          {
            "id": "action-1",
            "title": "Action 1",
            "description": "Invalid zero timeline.",
            "effort": "low",
            "impact": "medium",
            "timelineHours": 0
          },
          {
            "id": "action-2",
            "title": "Action 2",
            "description": "Valid action.",
            "effort": "medium",
            "impact": "high",
            "timelineHours": 2
          },
          {
            "id": "action-3",
            "title": "Action 3",
            "description": "Valid action.",
            "effort": "low",
            "impact": "high",
            "timelineHours": 1
          }
        ],
        "rationale": "Zero-hour action is not executable.",
        "nextStep": "Set a realistic positive estimate."
      }`),
    ).toBeNull();
  });

  it("returns null when an action has negative timelineHours", () => {
    expect(
      parseUltraplanResponse(`{
        "blocker": {
          "id": "blocker-1",
          "title": "Negative timeline",
          "description": "Action timeline must be positive.",
          "severity": 4,
          "category": "strategic"
        },
        "actions": [
          {
            "id": "action-1",
            "title": "Action 1",
            "description": "Invalid negative timeline.",
            "effort": "medium",
            "impact": "high",
            "timelineHours": -1
          },
          {
            "id": "action-2",
            "title": "Action 2",
            "description": "Valid action.",
            "effort": "low",
            "impact": "medium",
            "timelineHours": 1
          },
          {
            "id": "action-3",
            "title": "Action 3",
            "description": "Valid action.",
            "effort": "high",
            "impact": "high",
            "timelineHours": 6
          }
        ],
        "rationale": "Negative-hour action is invalid.",
        "nextStep": "Replace impossible estimates."
      }`),
    ).toBeNull();
  });

  it("returns null when the action count is outside the allowed range", () => {
    expect(
      parseUltraplanResponse(`{
        "blocker": {
          "id": "blocker-1",
          "title": "Too few actions",
          "description": "Needs more actions",
          "severity": 3,
          "category": "team"
        },
        "actions": [
          {
            "id": "action-1",
            "title": "Action 1",
            "description": "One",
            "effort": "low",
            "impact": "medium",
            "timelineHours": 1
          },
          {
            "id": "action-2",
            "title": "Action 2",
            "description": "Two",
            "effort": "medium",
            "impact": "high",
            "timelineHours": 2
          }
        ],
        "rationale": "bad",
        "nextStep": "bad"
      }`),
    ).toBeNull();
  });

  it("parses JSON embedded in surrounding text", () => {
    const result = parseUltraplanResponse(`Summary:
{
  "blocker": {
    "id": "blocker-1",
    "title": "Need sharper focus",
    "description": "The team is juggling too many bets.",
    "severity": 3,
    "category": "strategic"
  },
  "actions": [
    {
      "id": "action-1",
      "title": "Pause side bets",
      "description": "Stop low-signal initiatives.",
      "effort": "low",
      "impact": "high",
      "timelineHours": 1
    },
    {
      "id": "action-2",
      "title": "Rank opportunities",
      "description": "Score current bets.",
      "effort": "medium",
      "impact": "medium",
      "timelineHours": 2
    },
    {
      "id": "action-3",
      "title": "Commit to one path",
      "description": "Pick the highest-conviction path.",
      "effort": "medium",
      "impact": "high",
      "timelineHours": 2
    }
  ],
  "rationale": "Focus compounds execution.",
  "nextStep": "Cancel one low-value initiative today."
}
Done`);

    expect(result?.blocker.category).toBe("strategic");
    expect(result?.actions).toHaveLength(3);
  });
});
