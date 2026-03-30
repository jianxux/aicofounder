import OpenAI from "openai";
import { NextResponse } from "next/server";
import { buildBrainstormPrompt, parseBrainstormResponse } from "@/lib/brainstorm";

type BrainstormRequestBody = {
  projectName?: string;
  projectDescription?: string;
  focusArea?: string;
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
    const { projectName, projectDescription, focusArea }: BrainstormRequestBody = await request.json();

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
    const brainstormOpenAI = openai as unknown as BrainstormOpenAIClient;

    const completion = await brainstormOpenAI.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: buildBrainstormPrompt(projectName, projectDescription, focusArea),
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
  } catch {
    return NextResponse.json({ error: "Failed to get AI response" }, { status: 500 });
  }
}
