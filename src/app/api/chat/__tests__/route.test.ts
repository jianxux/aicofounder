import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OpenAI from "openai";

vi.mock("openai", () => ({
  default: vi.fn(),
}));

const openAIConstructor = vi.mocked(OpenAI);

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
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
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
    await expect(response.json()).resolves.toEqual({ error: "OpenAI API key not configured" });
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
    expect(payload.messages[0]).toMatchObject({ role: "system" });
    expect(payload.messages[1]).toEqual({ role: "user", content: "message-3" });
    expect(payload.messages.at(-1)).toEqual({ role: "assistant", content: "message-22" });
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
});
