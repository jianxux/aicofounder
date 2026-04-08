import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OpenAI from "openai";
import { buildPromptMemory } from "@/lib/prompt-memory";
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

vi.mock("@/lib/prompt-memory", () => ({
  buildPromptMemory: vi.fn(),
}));

const openAIConstructor = vi.mocked(OpenAI);
const buildPromptMemoryMock = vi.mocked(buildPromptMemory);
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
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    buildPromptMemoryMock.mockReturnValue({
      block: "",
      metadata: {
        query: "",
        entryIds: [],
        summaryIds: [],
        summaryLevel: null,
        reloadTokenEstimate: 0,
      },
    });
    buildResearchPromptMock.mockReturnValue("mocked research prompt");
    buildSynthesisPromptMock.mockReturnValue("mocked synthesis prompt");
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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
    await expect(response.json()).resolves.toEqual({
      error:
        "Missing required environment variables: OPENAI_API_KEY. Set them in your local .env file or Vercel project settings.",
    });
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
    expect(buildPromptMemoryMock).toHaveBeenCalledWith({
      query: "Orbit Startup research assistant What are the key opportunities and risks?",
      memoryEntries: undefined,
      memorySummaries: undefined,
    });
    expect(buildResearchPromptMock).toHaveBeenCalledTimes(RESEARCH_ANGLES.length);
    expect(buildResearchPromptMock).toHaveBeenNthCalledWith(
      1,
      RESEARCH_ANGLES[0].angle,
      "Orbit",
      "Startup research assistant",
      "What are the key opportunities and risks?",
      "",
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

  it("passes memory payload through the helper and each prompt builder", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    buildPromptMemoryMock.mockReturnValue({
      block: "Relevant memory context:\nSignal",
      metadata: {
        query: "Orbit Startup research assistant Risks",
        entryIds: ["entry-1"],
        summaryIds: ["summary-1"],
        summaryLevel: "session",
        reloadTokenEstimate: 9,
      },
    });

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
        choices: [{ message: { content: "summary" } }],
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
      .mockReturnValueOnce({
        id: "technical",
        title: "Technical",
        angle: "B",
        findings: "G",
        citations: [],
      })
      .mockReturnValueOnce({
        id: "competitive",
        title: "Competitive",
        angle: "C",
        findings: "H",
        citations: [],
      });

    const { POST } = await import("@/app/api/research/route");
    await POST(
      createRequest({
        projectName: "Orbit",
        projectDescription: "Startup research assistant",
        researchQuestion: "Risks",
        memoryEntries: [{ id: "entry-1" }],
        memorySummaries: [{ id: "summary-1" }],
      }),
    );

    expect(buildPromptMemoryMock).toHaveBeenCalledWith({
      query: "Orbit Startup research assistant Risks",
      memoryEntries: [{ id: "entry-1" }],
      memorySummaries: [{ id: "summary-1" }],
    });
    expect(buildResearchPromptMock).toHaveBeenCalledWith(
      RESEARCH_ANGLES[0].angle,
      "Orbit",
      "Startup research assistant",
      "Risks",
      "Relevant memory context:\nSignal",
    );
  });

  it("returns 500 when synthesis produces an empty summary", async () => {
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
        choices: [{ message: { content: "   " } }],
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
      .mockReturnValueOnce({
        id: "technical",
        title: "Technical",
        angle: "B",
        findings: "G",
        citations: [],
      })
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

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to synthesize report" });
  });

  it("returns a generic 500 when request parsing throws unexpectedly", async () => {
    const { POST } = await import("@/app/api/research/route");
    const response = await POST(
      new Request("http://localhost/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to get AI response" });
  });
});
