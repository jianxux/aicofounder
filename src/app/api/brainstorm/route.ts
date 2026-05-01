import OpenAI from "openai";
import { NextResponse } from "next/server";
import type { MemoryEntry, MemorySummary } from "@/lib/agent-memory";
import { buildBrainstormPrompt, parseBrainstormResponse } from "@/lib/brainstorm";
import { validateEnv } from "@/lib/env";
import { buildPromptMemory } from "@/lib/prompt-memory";

type BrainstormRequestBody = {
  projectName?: string;
  projectDescription?: string;
  focusArea?: string;
  memoryEntries?: MemoryEntry[];
  memorySummaries?: MemorySummary[];
};

type OpenAIChatMessage = {
  role: "system" | "user";
  content: string;
};

type BrainstormOpenAIClient = {
  chat: {
    completions: {
      create: (params: {
        model: string;
        temperature?: number;
        messages: OpenAIChatMessage[];
      }) => Promise<{
        choices?: Array<{
          message?: {
            content?: string | null;
          };
        }>;
      }>;
    };
  };
};

export async function POST(request: Request) {
  try {
    const { projectName, projectDescription, focusArea, memoryEntries, memorySummaries }: BrainstormRequestBody =
      await request.json();
    const normalizedProjectName = projectName?.trim();
    const normalizedProjectDescription = projectDescription?.trim();
    const normalizedFocusArea = focusArea?.trim() || undefined;

    if (!normalizedProjectName || !normalizedProjectDescription) {
      return NextResponse.json(
        { error: "Project name and project description are required" },
        { status: 400 },
      );
    }

    const env = validateEnv();

    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
    const brainstormOpenAI = openai as unknown as BrainstormOpenAIClient;

    const promptMemory = buildPromptMemory({
      query: [normalizedProjectName, normalizedProjectDescription, normalizedFocusArea].filter(Boolean).join(" "),
      memoryEntries,
      memorySummaries,
    });

    const completion = await brainstormOpenAI.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: buildBrainstormPrompt(
            normalizedProjectName,
            normalizedProjectDescription,
            normalizedFocusArea,
            promptMemory.block,
          ),
        },
        {
          role: "user",
          content: "Generate the brainstorm result as valid JSON.",
        },
      ],
    });

    const rawResponse = completion.choices?.[0]?.message?.content ?? "";
    const parsedResult = parseBrainstormResponse(rawResponse);

    if (!parsedResult) {
      return NextResponse.json({ error: "Failed to parse response" }, { status: 500 });
    }

    return NextResponse.json(parsedResult);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Missing required environment variables:")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Failed to get AI response" }, { status: 500 });
  }
}
