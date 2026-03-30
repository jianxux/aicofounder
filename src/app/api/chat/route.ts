import OpenAI from "openai";
import { NextResponse } from "next/server";

const SYSTEM_MESSAGE =
  "You are an AI cofounder — a sharp, critical thinking partner for building startups. You challenge assumptions, ask tough questions, suggest concrete next steps, and help validate ideas with data and research. Be direct, specific, and constructive. Avoid platitudes. If an idea has holes, say so clearly and suggest how to fix them.";

type RequestMessage = {
  sender: "user" | "assistant";
  content: string;
};

type ChatRequestBody = {
  messages?: RequestMessage[];
};

export async function POST(request: Request) {
  try {
    const { messages }: ChatRequestBody = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: SYSTEM_MESSAGE },
        ...messages.slice(-20).map((message) => ({
          role: message.sender === "user" ? "user" : "assistant",
          content: message.content,
        })),
      ],
    });

    return NextResponse.json({
      message: completion.choices[0]?.message?.content ?? "",
    });
  } catch {
    return NextResponse.json({ error: "Failed to get AI response" }, { status: 500 });
  }
}
