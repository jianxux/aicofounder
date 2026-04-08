import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OpenAI from "openai";
import { buildPromptMemory } from "@/lib/prompt-memory";
import { runResearch } from "@/lib/research";

vi.mock("openai", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/prompt-memory", () => ({
  buildPromptMemory: vi.fn(),
}));

vi.mock("@/lib/research", async () => {
  const actual = await vi.importActual<typeof import("@/lib/research")>("@/lib/research");

  return {
    ...actual,
    runResearch: vi.fn(),
  };
});

const openAIConstructor = vi.mocked(OpenAI);
const buildPromptMemoryMock = vi.mocked(buildPromptMemory);
const runResearchMock = vi.mocked(runResearch);

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
      block: "Relevant memory context:\nSignal",
      metadata: {
        query: "",
        entryIds: [],
        summaryIds: [],
        summaryLevel: null,
        reloadTokenEstimate: 0,
      },
    });
    openAIConstructor.mockImplementation(
      function mockOpenAI() {
        return {
          chat: { completions: { create: vi.fn() } },
        } as never;
      },
    );
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

  it("returns the report plus artifact on success", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    runResearchMock.mockResolvedValue({
      status: "completed",
      generatedAt: "2026-04-08T16:12:00.000Z",
      plan: {
        projectName: "Orbit",
        projectDescription: "Startup research assistant",
        researchQuestion: "What are the key opportunities and risks?",
        budget: { maxAngles: 3, maxSections: 3, maxCitationsPerSection: 3 },
        steps: [],
      },
      report: {
        sections: [{ id: "market", title: "Market", angle: "Demand", findings: "F", citations: [] }],
        executiveSummary: "Summary",
        researchQuestion: "What are the key opportunities and risks?",
        generatedAt: "2026-04-08T16:12:00.000Z",
      },
      selectedSources: [],
      rejectedSources: [],
      metrics: { attemptedAngles: 3, completedSections: 1, selectedSources: 0, rejectedSources: 0 },
      failures: [],
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
      sections: [{ id: "market", title: "Market" }],
      executiveSummary: "Summary",
      researchQuestion: "What are the key opportunities and risks?",
      artifact: {
        status: "completed",
        metrics: { attemptedAngles: 3 },
      },
    });
    expect(openAIConstructor).toHaveBeenCalledWith({ apiKey: "test-key" });
    expect(buildPromptMemoryMock).toHaveBeenCalledWith({
      query: "Orbit Startup research assistant What are the key opportunities and risks?",
      memoryEntries: undefined,
      memorySummaries: undefined,
    });
    expect(runResearchMock).toHaveBeenCalledWith(
      expect.objectContaining({ chat: expect.any(Object) }),
      {
        projectName: "Orbit",
        projectDescription: "Startup research assistant",
        researchQuestion: "What are the key opportunities and risks?",
        memoryContextBlock: "Relevant memory context:\nSignal",
      },
    );
  });

  it("passes memory payload into the prompt memory helper", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    runResearchMock.mockResolvedValue({
      status: "completed",
      generatedAt: "2026-04-08T16:12:00.000Z",
      plan: {
        projectName: "Orbit",
        projectDescription: "Startup research assistant",
        researchQuestion: "Risks",
        budget: { maxAngles: 3, maxSections: 3, maxCitationsPerSection: 3 },
        steps: [],
      },
      report: {
        sections: [],
        executiveSummary: "Summary",
        researchQuestion: "Risks",
        generatedAt: "2026-04-08T16:12:00.000Z",
      },
      selectedSources: [],
      rejectedSources: [],
      metrics: { attemptedAngles: 0, completedSections: 0, selectedSources: 0, rejectedSources: 0 },
      failures: [],
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
  });

  it("returns 500 with artifact when orchestrator fails", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    runResearchMock.mockResolvedValue({
      status: "failed",
      generatedAt: "2026-04-08T16:12:00.000Z",
      plan: {
        projectName: "Orbit",
        projectDescription: "Startup research assistant",
        researchQuestion: "What are the key opportunities and risks?",
        budget: { maxAngles: 3, maxSections: 3, maxCitationsPerSection: 3 },
        steps: [],
      },
      report: {
        sections: [],
        executiveSummary: "Evidence is limited.",
        researchQuestion: "What are the key opportunities and risks?",
        generatedAt: "2026-04-08T16:12:00.000Z",
      },
      selectedSources: [],
      rejectedSources: [],
      metrics: { attemptedAngles: 3, completedSections: 0, selectedSources: 0, rejectedSources: 0 },
      failures: [{ stage: "gather", code: "no-evidence", message: "No research sections passed validation" }],
    });

    const { POST } = await import("@/app/api/research/route");
    const response = await POST(
      createRequest({
        projectName: "Orbit",
        projectDescription: "Startup research assistant",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: "No research sections passed validation",
      artifact: {
        status: "failed",
      },
    });
  });

  it("falls back to a generic error message when a failed artifact has no failures", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    runResearchMock.mockResolvedValue({
      status: "failed",
      generatedAt: "2026-04-08T16:12:00.000Z",
      plan: {
        projectName: "Orbit",
        projectDescription: "Startup research assistant",
        researchQuestion: "What are the key opportunities and risks?",
        budget: { maxAngles: 3, maxSections: 3, maxCitationsPerSection: 3 },
        steps: [],
      },
      report: {
        sections: [],
        executiveSummary: "Evidence is limited.",
        researchQuestion: "What are the key opportunities and risks?",
        generatedAt: "2026-04-08T16:12:00.000Z",
      },
      selectedSources: [],
      rejectedSources: [],
      metrics: { attemptedAngles: 0, completedSections: 0, selectedSources: 0, rejectedSources: 0 },
      failures: [],
    });

    const { POST } = await import("@/app/api/research/route");
    const response = await POST(
      createRequest({
        projectName: "Orbit",
        projectDescription: "Startup research assistant",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: "Failed to get AI response",
      artifact: {
        status: "failed",
      },
    });
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
