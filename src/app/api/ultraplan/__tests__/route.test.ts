import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OpenAI from "openai";
import { buildUltraplanPrompt, parseUltraplanResponse } from "@/lib/ultraplan";

vi.mock("openai", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/ultraplan", () => ({
  buildUltraplanPrompt: vi.fn(),
  parseUltraplanResponse: vi.fn(),
}));

const openAIConstructor = vi.mocked(OpenAI);
const buildUltraplanPromptMock = vi.mocked(buildUltraplanPrompt);
const parseUltraplanResponseMock = vi.mocked(parseUltraplanResponse);

const createRequest = (body: unknown) =>
  new Request("http://localhost/api/ultraplan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

describe("POST /api/ultraplan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.OPENAI_API_KEY;
    buildUltraplanPromptMock.mockReturnValue("mocked ultraplan prompt");
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it("returns 400 when required fields are missing", async () => {
    const { POST } = await import("@/app/api/ultraplan/route");

    const response = await POST(createRequest({ projectName: "Orbit" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Project name and project description are required",
    });
  });

  it("returns 500 when OPENAI_API_KEY is not set", async () => {
    const { POST } = await import("@/app/api/ultraplan/route");

    const response = await POST(
      createRequest({
        projectName: "Orbit",
        projectDescription: "Startup research assistant",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "OpenAI API key not configured" });
    expect(openAIConstructor).not.toHaveBeenCalled();
  });

  it("returns the parsed ultraplan result on success", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    const create = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content:
              '{"blocker":{"id":"blocker-1","title":"Unclear ICP","description":"The product lacks a sharp ideal customer profile.","severity":4,"category":"market"},"actions":[{"id":"action-1","title":"Interview five leads","description":"Run structured calls with current prospects.","effort":"medium","impact":"high","timelineHours":6},{"id":"action-2","title":"Rewrite landing page","description":"Align messaging to the strongest problem statement.","effort":"low","impact":"medium","timelineHours":3},{"id":"action-3","title":"Add qualification form","description":"Capture segment data before demos.","effort":"low","impact":"medium","timelineHours":2}],"rationale":"Weak positioning is slowing conversion and feedback quality.","nextStep":"Schedule the first five customer interviews today."}',
          },
        },
      ],
    });

    openAIConstructor.mockImplementation(
      function mockOpenAI() {
        return {
          chat: {
            completions: {
              create,
            },
          },
        } as never;
      },
    );

    parseUltraplanResponseMock.mockReturnValue({
      blocker: {
        id: "blocker-1",
        title: "Unclear ICP",
        description: "The product lacks a sharp ideal customer profile.",
        severity: 4,
        category: "market",
      },
      actions: [
        {
          id: "action-1",
          title: "Interview five leads",
          description: "Run structured calls with current prospects.",
          effort: "medium",
          impact: "high",
          timelineHours: 6,
        },
        {
          id: "action-2",
          title: "Rewrite landing page",
          description: "Align messaging to the strongest problem statement.",
          effort: "low",
          impact: "medium",
          timelineHours: 3,
        },
        {
          id: "action-3",
          title: "Add qualification form",
          description: "Capture segment data before demos.",
          effort: "low",
          impact: "medium",
          timelineHours: 2,
        },
      ],
      rationale: "Weak positioning is slowing conversion and feedback quality.",
      nextStep: "Schedule the first five customer interviews today.",
    });

    const { POST } = await import("@/app/api/ultraplan/route");
    const response = await POST(
      createRequest({
        projectName: "Orbit",
        projectDescription: "Startup research assistant",
        currentPhase: "Validation",
        completedTasks: 2,
        totalTasks: 8,
        recentMessages: ["Need clearer audience", "Landing page feels generic"],
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      blocker: {
        id: "blocker-1",
        title: "Unclear ICP",
        description: "The product lacks a sharp ideal customer profile.",
        severity: 4,
        category: "market",
      },
      actions: [
        {
          id: "action-1",
          title: "Interview five leads",
          description: "Run structured calls with current prospects.",
          effort: "medium",
          impact: "high",
          timelineHours: 6,
        },
        {
          id: "action-2",
          title: "Rewrite landing page",
          description: "Align messaging to the strongest problem statement.",
          effort: "low",
          impact: "medium",
          timelineHours: 3,
        },
        {
          id: "action-3",
          title: "Add qualification form",
          description: "Capture segment data before demos.",
          effort: "low",
          impact: "medium",
          timelineHours: 2,
        },
      ],
      rationale: "Weak positioning is slowing conversion and feedback quality.",
      nextStep: "Schedule the first five customer interviews today.",
    });
    expect(openAIConstructor).toHaveBeenCalledWith({ apiKey: "test-key" });
    expect(buildUltraplanPromptMock).toHaveBeenCalledWith(
      "Orbit",
      "Startup research assistant",
      "Validation",
      2,
      8,
      ["Need clearer audience", "Landing page feels generic"],
    );
    expect(parseUltraplanResponseMock).toHaveBeenCalledWith(
      '{"blocker":{"id":"blocker-1","title":"Unclear ICP","description":"The product lacks a sharp ideal customer profile.","severity":4,"category":"market"},"actions":[{"id":"action-1","title":"Interview five leads","description":"Run structured calls with current prospects.","effort":"medium","impact":"high","timelineHours":6},{"id":"action-2","title":"Rewrite landing page","description":"Align messaging to the strongest problem statement.","effort":"low","impact":"medium","timelineHours":3},{"id":"action-3","title":"Add qualification form","description":"Capture segment data before demos.","effort":"low","impact":"medium","timelineHours":2}],"rationale":"Weak positioning is slowing conversion and feedback quality.","nextStep":"Schedule the first five customer interviews today."}',
    );
    expect(create).toHaveBeenCalledWith({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: "mocked ultraplan prompt" },
        { role: "user", content: "Generate the ultraplan result as valid JSON." },
      ],
    });
  });

  it("returns 500 when parsing fails", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    openAIConstructor.mockImplementation(
      function mockOpenAI() {
        return {
          chat: {
            completions: {
              create: vi.fn().mockResolvedValue({
                choices: [
                  {
                    message: {
                      content: "bad response",
                    },
                  },
                ],
              }),
            },
          },
        } as never;
      },
    );

    parseUltraplanResponseMock.mockReturnValue(null);

    const { POST } = await import("@/app/api/ultraplan/route");
    const response = await POST(
      createRequest({
        projectName: "Orbit",
        projectDescription: "Startup research assistant",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to parse response" });
  });
});
