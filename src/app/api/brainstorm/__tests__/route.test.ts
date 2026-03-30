import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OpenAI from "openai";
import { buildBrainstormPrompt, parseBrainstormResponse } from "@/lib/brainstorm";

vi.mock("openai", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/brainstorm", () => ({
  buildBrainstormPrompt: vi.fn(),
  parseBrainstormResponse: vi.fn(),
}));

const openAIConstructor = vi.mocked(OpenAI);
const buildBrainstormPromptMock = vi.mocked(buildBrainstormPrompt);
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
    buildBrainstormPromptMock.mockReturnValue("mocked brainstorm prompt");
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
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
    await expect(response.json()).resolves.toEqual({ error: "OpenAI API key not configured" });
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
    expect(buildBrainstormPromptMock).toHaveBeenCalledWith(
      "Orbit",
      "Startup research assistant",
      "Validation",
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
});
