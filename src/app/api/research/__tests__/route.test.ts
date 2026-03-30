import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OpenAI from "openai";
import {
  buildResearchPrompt,
  buildSynthesisPrompt,
  parseResearchResponse,
  RESEARCH_ANGLES,
} from "@/lib/research";

vi.mock("openai", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/research", async () => {
  const actual = await vi.importActual<typeof import("@/lib/research")>("@/lib/research");

  return {
    ...actual,
    buildResearchPrompt: vi.fn(),
    buildSynthesisPrompt: vi.fn(),
    parseResearchResponse: vi.fn(),
  };
});

const openAIConstructor = vi.mocked(OpenAI);
const buildResearchPromptMock = vi.mocked(buildResearchPrompt);
const buildSynthesisPromptMock = vi.mocked(buildSynthesisPrompt);
const parseResearchResponseMock = vi.mocked(parseResearchResponse);

const createRequest = (body: unknown) =>
  new Request("http://localhost/api/research", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

describe("POST /api/research", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.OPENAI_API_KEY;
    buildResearchPromptMock.mockReturnValue("mocked research prompt");
    buildSynthesisPromptMock.mockReturnValue("mocked synthesis prompt");
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it("returns 400 when required fields are missing", async () => {
    const { POST } = await import("@/app/api/research/route");

    const response = await POST(createRequest({ projectName: "Orbit" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Project name and project description are required",
    });
  });

  it("returns 500 when OPENAI_API_KEY is not set", async () => {
    const { POST } = await import("@/app/api/research/route");

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

  it("returns a synthesized report when at least one section parses", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    const create = vi
      .fn()
      .mockResolvedValueOnce({
        choices: [{ message: { content: '{"id":"market","title":"Market","angle":"A","findings":"F","citations":[]}' } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: '{"id":"technical","title":"Technical","angle":"B","findings":"G","citations":[]}' } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: '{"id":"competitive","title":"Competitive","angle":"C","findings":"H","citations":[]}' } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: "Opportunities outweigh immediate technical risks." } }],
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

    parseResearchResponseMock
      .mockReturnValueOnce({
        id: "market",
        title: "Market",
        angle: "A",
        findings: "F",
        citations: [],
      })
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({
        id: "competitive",
        title: "Competitive",
        angle: "C",
        findings: "H",
        citations: [],
      });

    const { POST } = await import("@/app/api/research/route");
    const response = await POST(
      createRequest({
        projectName: "Orbit",
        projectDescription: "Startup research assistant",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      sections: [
        {
          id: "market",
          title: "Market",
        },
        {
          id: "competitive",
          title: "Competitive",
        },
      ],
      executiveSummary: "Opportunities outweigh immediate technical risks.",
      researchQuestion: "What are the key opportunities and risks?",
    });
    expect(openAIConstructor).toHaveBeenCalledWith({ apiKey: "test-key" });
    expect(buildResearchPromptMock).toHaveBeenCalledTimes(RESEARCH_ANGLES.length);
    expect(buildResearchPromptMock).toHaveBeenNthCalledWith(
      1,
      RESEARCH_ANGLES[0].angle,
      "Orbit",
      "Startup research assistant",
      "What are the key opportunities and risks?",
    );
    expect(parseResearchResponseMock).toHaveBeenCalledTimes(RESEARCH_ANGLES.length);
    expect(buildSynthesisPromptMock).toHaveBeenCalledWith(
      [
        {
          id: "market",
          title: "Market",
          angle: "A",
          findings: "F",
          citations: [],
        },
        {
          id: "competitive",
          title: "Competitive",
          angle: "C",
          findings: "H",
          citations: [],
        },
      ],
      "What are the key opportunities and risks?",
    );
    expect(create).toHaveBeenCalledTimes(4);
    expect(create).toHaveBeenLastCalledWith({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: "mocked synthesis prompt" },
        { role: "user", content: "Generate the executive summary." },
      ],
    });
  });

  it("returns 500 when no section parses successfully", async () => {
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

    parseResearchResponseMock.mockReturnValue(null);

    const { POST } = await import("@/app/api/research/route");
    const response = await POST(
      createRequest({
        projectName: "Orbit",
        projectDescription: "Startup research assistant",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to parse response" });
    expect(buildSynthesisPromptMock).not.toHaveBeenCalled();
  });
});
