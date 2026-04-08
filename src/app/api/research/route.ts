import OpenAI from "openai";
import { NextResponse } from "next/server";
import type { MemoryEntry, MemorySummary } from "@/lib/agent-memory";
import { validateEnv } from "@/lib/env";
import { buildPromptMemory } from "@/lib/prompt-memory";
import {
  buildResearchPrompt,
  buildSynthesisPrompt,
  parseResearchResponse,
  RESEARCH_ANGLES,
} from "@/lib/research";

type ResearchRequestBody = {
  projectName?: string;
  projectDescription?: string;
  researchQuestion?: string;
  memoryEntries?: MemoryEntry[];
  memorySummaries?: MemorySummary[];
};

type OpenAIChatMessage = {
  role: "system" | "user";
  content: string;
};

type ResearchOpenAIClient = {
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
    const { projectName, projectDescription, researchQuestion, memoryEntries, memorySummaries }: ResearchRequestBody =
      await request.json();
    const normalizedQuestion = researchQuestion?.trim() || "What are the key opportunities and risks?";

    if (!projectName?.trim() || !projectDescription?.trim()) {
      return NextResponse.json(
        { error: "Project name and project description are required" },
        { status: 400 },
      );
    }

    const env = validateEnv();

    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
    const researchOpenAI = openai as unknown as ResearchOpenAIClient;

    const promptMemory = buildPromptMemory({
      query: [projectName, projectDescription, normalizedQuestion].filter(Boolean).join(" "),
      memoryEntries,
      memorySummaries,
    });

    const sectionResponses = await Promise.allSettled(
      RESEARCH_ANGLES.map(async (researchAngle) => {
        const completion = await researchOpenAI.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content: buildResearchPrompt(
                researchAngle.angle,
                projectName,
                projectDescription,
                normalizedQuestion,
                promptMemory.block,
              ),
            },
            {
              role: "user",
              content: "Generate the research section as valid JSON.",
            },
          ],
        });

        return parseResearchResponse(completion.choices?.[0]?.message?.content ?? "");
      }),
    );

    const sections = sectionResponses
      .filter(
        (
          result,
        ): result is PromiseFulfilledResult<ReturnType<typeof parseResearchResponse>> =>
          result.status === "fulfilled",
      )
      .map((result) => result.value)
      .filter((section): section is NonNullable<typeof section> => section !== null);

    if (sections.length === 0) {
      return NextResponse.json({ error: "Failed to parse response" }, { status: 500 });
    }

    const synthesisCompletion = await researchOpenAI.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: buildSynthesisPrompt(sections, normalizedQuestion),
        },
        {
          role: "user",
          content: "Generate the executive summary.",
        },
      ],
    });

    const executiveSummary = synthesisCompletion.choices?.[0]?.message?.content?.trim();

    if (!executiveSummary) {
      return NextResponse.json({ error: "Failed to synthesize report" }, { status: 500 });
    }

    return NextResponse.json({
      sections,
      executiveSummary,
      researchQuestion: normalizedQuestion,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Missing required environment variables:")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Failed to get AI response" }, { status: 500 });
  }
}
