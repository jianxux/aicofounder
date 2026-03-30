import OpenAI from "openai";
import { NextResponse } from "next/server";
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
    const { projectName, projectDescription, researchQuestion }: ResearchRequestBody = await request.json();
    const normalizedQuestion = researchQuestion?.trim() || "What are the key opportunities and risks?";

    if (!projectName?.trim() || !projectDescription?.trim()) {
      return NextResponse.json(
        { error: "Project name and project description are required" },
        { status: 400 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const researchOpenAI = openai as unknown as ResearchOpenAIClient;

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
  } catch {
    return NextResponse.json({ error: "Failed to get AI response" }, { status: 500 });
  }
}
