import OpenAI from "openai";
import { NextResponse } from "next/server";
import type { MemoryEntry, MemorySummary } from "@/lib/agent-memory";
import { validateEnv } from "@/lib/env";
import { buildPromptMemory } from "@/lib/prompt-memory";
import { runResearch, type ResearchOpenAIClient } from "@/lib/research";

type ResearchRequestBody = {
  projectName?: string;
  projectDescription?: string;
  researchQuestion?: string;
  memoryEntries?: MemoryEntry[];
  memorySummaries?: MemorySummary[];
};

export async function POST(request: Request) {
  try {
    const { projectName, projectDescription, researchQuestion, memoryEntries, memorySummaries }: ResearchRequestBody =
      await request.json();

    if (!projectName?.trim() || !projectDescription?.trim()) {
      return NextResponse.json(
        { error: "Project name and project description are required" },
        { status: 400 },
      );
    }

    const normalizedQuestion = researchQuestion?.trim() || "What are the key opportunities and risks?";
    const env = validateEnv();
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY }) as unknown as ResearchOpenAIClient;
    const promptMemory = buildPromptMemory({
      query: [projectName, projectDescription, normalizedQuestion].filter(Boolean).join(" "),
      memoryEntries,
      memorySummaries,
    });

    const artifact = await runResearch(openai, {
      projectName,
      projectDescription,
      researchQuestion: normalizedQuestion,
      memoryContextBlock: promptMemory.block,
    });

    if (artifact.status === "failed") {
      const primaryFailure = artifact.failures[artifact.failures.length - 1];
      return NextResponse.json(
        {
          error: primaryFailure?.message || "Failed to get AI response",
          artifact,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ...artifact.report,
      artifact,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Missing required environment variables:")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Failed to get AI response" }, { status: 500 });
  }
}
