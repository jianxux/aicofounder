import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OpenAI from "openai";
import { buildPromptMemory } from "@/lib/prompt-memory";
import { buildSystemPrompt } from "@/lib/prompts";

vi.mock("openai", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/prompts", () => ({
  buildSystemPrompt: vi.fn(),
}));

vi.mock("@/lib/prompt-memory", () => ({
  buildPromptMemory: vi.fn(),
}));

const openAIConstructor = vi.mocked(OpenAI);
const buildPromptMemoryMock = vi.mocked(buildPromptMemory);
const buildSystemPromptMock = vi.mocked(buildSystemPrompt);

const createRequest = (body: unknown) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

function createAsyncIterableStream(
  chunks: Array<{ choices: Array<{ delta?: { content?: string } }> }>,
  options?: { error?: Error; throwAfterIndex?: number },
) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const [index, chunk] of chunks.entries()) {
        if (options?.error && options.throwAfterIndex === index) {
          throw options.error;
        }

        yield chunk;
      }

      if (options?.error && options.throwAfterIndex === chunks.length) {
        throw options.error;
      }
    },
  };
}

describe("POST /api/chat", () => {
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
    buildSystemPromptMock.mockReturnValue("mocked system prompt");
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("returns 400 for empty messages", async () => {
    const { POST } = await import("@/app/api/chat/route");

    const response = await POST(createRequest({ messages: [] }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Messages are required" });
  });

  it("returns 400 when messages field is missing", async () => {
    const { POST } = await import("@/app/api/chat/route");

    const response = await POST(createRequest({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Messages are required" });
  });

  it("returns 500 when OPENAI_API_KEY is not set", async () => {
    const { POST } = await import("@/app/api/chat/route");

    const response = await POST(
      createRequest({
        messages: [{ sender: "user", content: "Validate this idea" }],
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error:
        "Missing required environment variables: OPENAI_API_KEY. Set them in your local .env file or Vercel project settings.",
    });
    expect(openAIConstructor).not.toHaveBeenCalled();
  });

  it("streams SSE chunks on success", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    const create = vi.fn().mockResolvedValue(
      createAsyncIterableStream([
        { choices: [{ delta: { content: "Your ICP " } }] },
        { choices: [{ delta: { content: "is too broad." } }] },
      ]),
    );

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

    const { POST } = await import("@/app/api/chat/route");
    const response = await POST(
      createRequest({
        messages: Array.from({ length: 22 }, (_, index) => ({
          sender: index % 2 === 0 ? "user" : "assistant",
          content: `message-${index + 1}`,
        })),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(response.headers.get("Cache-Control")).toBe("no-cache");
    expect(response.headers.get("Connection")).toBe("keep-alive");
    await expect(response.text()).resolves.toBe(
      'data: {"content":"Your ICP "}\n\n' +
        'data: {"content":"is too broad."}\n\n' +
        "data: [DONE]\n\n",
    );

    expect(openAIConstructor).toHaveBeenCalledWith({ apiKey: "test-key" });
    expect(create).toHaveBeenCalledTimes(1);

    const payload = create.mock.calls[0][0];
    expect(payload.model).toBe("gpt-4o-mini");
    expect(payload.stream).toBe(true);
    expect(payload.temperature).toBe(0.7);
    expect(payload.messages).toHaveLength(21);
    expect(buildPromptMemoryMock).toHaveBeenCalledWith({
      messages: Array.from({ length: 22 }, (_, index) => ({
        sender: index % 2 === 0 ? "user" : "assistant",
        content: `message-${index + 1}`,
      })),
      memoryEntries: undefined,
      memorySummaries: undefined,
    });
    expect(buildSystemPromptMock).toHaveBeenCalledWith("", undefined, "", null);
    expect(payload.messages[0]).toEqual({ role: "system", content: "mocked system prompt" });
    expect(payload.messages[1]).toEqual({ role: "user", content: "message-3" });
    expect(payload.messages.at(-1)).toEqual({ role: "assistant", content: "message-22" });
  });

  it("passes phase and projectName to the prompt builder", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    const create = vi.fn().mockResolvedValue(
      createAsyncIterableStream([{ choices: [{ delta: { content: "ready" } }] }]),
    );

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

    const { POST } = await import("@/app/api/chat/route");
    const response = await POST(
      createRequest({
        messages: [{ sender: "user", content: "Help me launch" }],
        phase: "launch",
        projectName: "Orbit",
      }),
    );

    expect(response.status).toBe(200);
    expect(buildSystemPromptMock).toHaveBeenCalledWith("launch", "Orbit", "", null);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].messages[0]).toEqual({
      role: "system",
      content: "mocked system prompt",
    });
  });

  it("sends an error chunk if streaming fails mid-response", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    const create = vi.fn().mockResolvedValue(
      createAsyncIterableStream([{ choices: [{ delta: { content: "partial" } }] }], {
        error: new Error("stream exploded"),
        throwAfterIndex: 1,
      }),
    );

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

    const { POST } = await import("@/app/api/chat/route");
    const response = await POST(
      createRequest({
        messages: [{ sender: "user", content: "Test" }],
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe(
      'data: {"content":"partial"}\n\n' + 'data: {"error":"stream exploded"}\n\n',
    );
  });

  it("skips empty stream chunks and still terminates the SSE stream", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    const create = vi.fn().mockResolvedValue(
      createAsyncIterableStream([
        { choices: [{ delta: {} }] },
        { choices: [{ delta: { content: "" } }] },
        { choices: [{ delta: { content: "kept" } }] },
      ]),
    );

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

    const { POST } = await import("@/app/api/chat/route");
    const response = await POST(
      createRequest({
        messages: [{ sender: "user", content: "Test" }],
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe('data: {"content":"kept"}\n\n' + "data: [DONE]\n\n");
  });

  it("returns 500 when the OpenAI client throws before streaming starts", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    openAIConstructor.mockImplementation(
      function mockOpenAI() {
        return {
          chat: {
            completions: {
              create: vi.fn().mockRejectedValue(new Error("boom")),
            },
          },
        } as never;
      },
    );

    const { POST } = await import("@/app/api/chat/route");
    const response = await POST(
      createRequest({
        messages: [{ sender: "user", content: "Test" }],
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to get AI response" });
  });

  it("passes memory payload through the helper and prompt builder", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    buildPromptMemoryMock.mockReturnValue({
      block: "Relevant memory context:\nKey facts",
      metadata: {
        query: "launch",
        entryIds: ["entry-1"],
        summaryIds: ["summary-1"],
        summaryLevel: "session",
        reloadTokenEstimate: 12,
      },
    });

    const create = vi.fn().mockResolvedValue(
      createAsyncIterableStream([{ choices: [{ delta: { content: "ready" } }] }]),
    );

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

    const { POST } = await import("@/app/api/chat/route");
    await POST(
      createRequest({
        messages: [{ sender: "user", content: "Help me launch" }],
        memoryEntries: [{ id: "entry-1" }],
        memorySummaries: [{ id: "summary-1" }],
      }),
    );

    expect(buildPromptMemoryMock).toHaveBeenCalledWith({
      messages: [{ sender: "user", content: "Help me launch" }],
      memoryEntries: [{ id: "entry-1" }],
      memorySummaries: [{ id: "summary-1" }],
    });
    expect(buildSystemPromptMock).toHaveBeenCalledWith("", undefined, "Relevant memory context:\nKey facts", null);
  });

  it("passes active artifact context into the system prompt", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    const create = vi.fn().mockResolvedValue(
      createAsyncIterableStream([{ choices: [{ delta: { content: "ready" } }] }]),
    );

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

    const artifactContext = {
      id: "artifact-validation-scorecard",
      type: "validation-scorecard",
      label: "Validation scorecard",
      status: "completed",
      mode: "artifact-follow-up",
      hasMeaningfulOutput: true,
      revision: {
        id: "revision-2",
        number: 2,
        createdAt: "2025-01-12T00:00:00.000Z",
        status: "completed",
      },
      evidenceSnapshot: {
        artifactType: "validation-scorecard",
        summary: "Strong signal",
        criteriaCount: 1,
        scoredCriteriaCount: 1,
        criteria: [{ label: "Problem urgency", score: 4 }],
      },
    } as const;

    const { POST } = await import("@/app/api/chat/route");
    const response = await POST(
      createRequest({
        messages: [{ sender: "user", content: "Refine the scorecard" }],
        artifactContext,
        isRefineMode: true,
      }),
    );

    expect(response.status).toBe(200);
    expect(buildSystemPromptMock).toHaveBeenCalledWith("", undefined, "", artifactContext);
  });

  it("derives a minimal artifact context from the legacy artifact fields", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    const create = vi.fn().mockResolvedValue(
      createAsyncIterableStream([{ choices: [{ delta: { content: "ready" } }] }]),
    );

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

    const { POST } = await import("@/app/api/chat/route");
    const response = await POST(
      createRequest({
        messages: [{ sender: "user", content: "Refine the memo" }],
        artifact: {
          id: "artifact-customer-research-memo",
          type: "customer-research-memo",
          label: "Customer research memo",
        },
        isRefineMode: true,
      }),
    );

    expect(response.status).toBe(200);
    expect(buildSystemPromptMock).toHaveBeenCalledWith("", undefined, "", {
      id: "artifact-customer-research-memo",
      type: "customer-research-memo",
      label: "Customer research memo",
      status: "completed",
      mode: "artifact-follow-up",
      hasMeaningfulOutput: true,
      revision: {
        id: "legacy-artifact-revision",
        number: 1,
        createdAt: "",
        status: "completed",
      },
      evidenceSnapshot: {
        artifactType: "customer-research-memo",
        researchStatus: "success",
        keyFindings: [],
        contradictions: [],
        unansweredQuestions: [],
        sourceCount: 0,
        sectionCount: 0,
      },
    });
  });
});
