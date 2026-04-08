import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OpenAI from "openai";
import { buildBrainstormPrompt, parseBrainstormResponse } from "@/lib/brainstorm";
import { buildPromptMemory } from "@/lib/prompt-memory";

vi.mock("openai", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/brainstorm", () => ({
  buildBrainstormPrompt: vi.fn(),
  parseBrainstormResponse: vi.fn(),
}));

vi.mock("@/lib/prompt-memory", () => ({
  buildPromptMemory: vi.fn(),
}));

const openAIConstructor = vi.mocked(OpenAI);
const buildBrainstormPromptMock = vi.mocked(buildBrainstormPrompt);
const buildPromptMemoryMock = vi.mocked(buildPromptMemory);
const parseBrainstormResponseMock = vi.mocked(parseBrainstormResponse);

const createRequest = (body: unknown) =>
  new Request("http://localhost/api/brainstorm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

describe("POST /api/brainstorm", () => {
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
    buildBrainstormPromptMock.mockReturnValue("mocked brainstorm prompt");
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("returns 400 when required fields are missing", async () => {
    const { POST } = await import("@/app/api/brainstorm/route");

    const response = await POST(createRequest({ projectName: "Orbit" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Project name and project description are required",
    });
  });

  it("returns 500 when OPENAI_API_KEY is not set", async () => {
    const { POST } = await import("@/app/api/brainstorm/route");

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

  it("returns the parsed brainstorm result on success", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    const create = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: '{"painPoints":[],"summary":"Strong demand","searchContext":"Checked r/SaaS"}',
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

    parseBrainstormResponseMock.mockReturnValue({
      painPoints: [],
      summary: "Strong demand",
      searchContext: "Checked r/SaaS",
    });

    const { POST } = await import("@/app/api/brainstorm/route");
    const response = await POST(
      createRequest({
        projectName: "Orbit",
        projectDescription: "Startup research assistant",
        focusArea: "Validation",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      painPoints: [],
      summary: "Strong demand",
      searchContext: "Checked r/SaaS",
    });
    expect(openAIConstructor).toHaveBeenCalledWith({ apiKey: "test-key" });
    expect(buildPromptMemoryMock).toHaveBeenCalledWith({
      query: "Orbit Startup research assistant Validation",
      memoryEntries: undefined,
      memorySummaries: undefined,
    });
    expect(buildBrainstormPromptMock).toHaveBeenCalledWith(
      "Orbit",
      "Startup research assistant",
      "Validation",
      "",
    );
    expect(parseBrainstormResponseMock).toHaveBeenCalledWith(
      '{"painPoints":[],"summary":"Strong demand","searchContext":"Checked r/SaaS"}',
    );
    expect(create).toHaveBeenCalledWith({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: "mocked brainstorm prompt" },
        { role: "user", content: "Generate the brainstorm result as valid JSON." },
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

    parseBrainstormResponseMock.mockReturnValue(null);

    const { POST } = await import("@/app/api/brainstorm/route");
    const response = await POST(
      createRequest({
        projectName: "Orbit",
        projectDescription: "Startup research assistant",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to parse response" });
  });

  it("passes memory payload through the helper and prompt builder", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    buildPromptMemoryMock.mockReturnValue({
      block: "Relevant memory context:\nSignal",
      metadata: {
        query: "Orbit Startup research assistant",
        entryIds: ["entry-1"],
        summaryIds: ["summary-1"],
        summaryLevel: "session",
        reloadTokenEstimate: 8,
      },
    });

    openAIConstructor.mockImplementation(
      function mockOpenAI() {
        return {
          chat: {
            completions: {
              create: vi.fn().mockResolvedValue({
                choices: [{ message: { content: '{"painPoints":[],"summary":"ok","searchContext":"ok"}' } }],
              }),
            },
          },
        } as never;
      },
    );
    parseBrainstormResponseMock.mockReturnValue({ painPoints: [], summary: "ok", searchContext: "ok" });

    const { POST } = await import("@/app/api/brainstorm/route");
    await POST(
      createRequest({
        projectName: "Orbit",
        projectDescription: "Startup research assistant",
        memoryEntries: [{ id: "entry-1" }],
        memorySummaries: [{ id: "summary-1" }],
      }),
    );

    expect(buildPromptMemoryMock).toHaveBeenCalledWith({
      query: "Orbit Startup research assistant",
      memoryEntries: [{ id: "entry-1" }],
      memorySummaries: [{ id: "summary-1" }],
    });
    expect(buildBrainstormPromptMock).toHaveBeenCalledWith(
      "Orbit",
      "Startup research assistant",
      undefined,
      "Relevant memory context:\nSignal",
    );
  });

  it("returns a generic 500 when the OpenAI request fails", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    openAIConstructor.mockImplementation(
      function mockOpenAI() {
        return {
          chat: {
            completions: {
              create: vi.fn().mockRejectedValue("boom"),
            },
          },
        } as never;
      },
    );

    const { POST } = await import("@/app/api/brainstorm/route");
    const response = await POST(
      createRequest({
        projectName: "Orbit",
        projectDescription: "Startup research assistant",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to get AI response" });
  });
});
