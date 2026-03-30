import OpenAI from "openai";
import { NextResponse } from "next/server";
import { buildUltraplanPrompt, parseUltraplanResponse } from "@/lib/ultraplan";

type UltraplanRequestBody = {
  projectName?: string;
  projectDescription?: string;
  currentPhase?: string;
  completedTasks?: number;
  totalTasks?: number;
  recentMessages?: string[];
};

type OpenAIChatMessage = {
  role: "system" | "user";
  content: string;
};

type UltraplanOpenAIClient = {
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
    const {
      projectName,
      projectDescription,
      currentPhase,
      completedTasks,
      totalTasks,
      recentMessages,
    }: UltraplanRequestBody = await request.json();

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
    const ultraplanOpenAI = openai as unknown as UltraplanOpenAIClient;

    const completion = await ultraplanOpenAI.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: buildUltraplanPrompt(
            projectName,
            projectDescription,
            currentPhase ?? "",
            completedTasks ?? 0,
            totalTasks ?? 0,
            recentMessages,
          ),
        },
        {
          role: "user",
          content: "Generate the ultraplan result as valid JSON.",
        },
      ],
    });

    const rawResponse = completion.choices?.[0]?.message?.content ?? "";
    const parsedResult = parseUltraplanResponse(rawResponse);

    if (!parsedResult) {
      return NextResponse.json({ error: "Failed to parse response" }, { status: 500 });
    }

    return NextResponse.json(parsedResult);
  } catch {
    return NextResponse.json({ error: "Failed to get AI response" }, { status: 500 });
  }
}
