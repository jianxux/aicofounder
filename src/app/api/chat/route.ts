import OpenAI from "openai";
import { NextResponse } from "next/server";
import type { MemoryEntry, MemorySummary } from "@/lib/agent-memory";
import { validateEnv } from "@/lib/env";
import { buildPromptMemory } from "@/lib/prompt-memory";
import { buildSystemPrompt } from "@/lib/prompts";
import type { ArtifactContextPayload, ProjectArtifactType } from "@/lib/types";

type RequestMessage = {
  sender: "user" | "assistant";
  content: string;
};

type ChatRequestBody = {
  messages?: RequestMessage[];
  phase?: string;
  projectName?: string;
  memoryEntries?: MemoryEntry[];
  memorySummaries?: MemorySummary[];
  artifact?: {
    id: string;
    type: ProjectArtifactType;
    label: string;
  } | null;
  artifactContext?: ArtifactContextPayload | null;
  isRefineMode?: boolean;
};

type OpenAIChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAIStreamChunk = {
  choices: Array<{
    delta?: {
      content?: string;
    };
  }>;
};

type StreamingOpenAIClient = {
  chat: {
    completions: {
      create: (params: {
        model: string;
        stream: true;
        temperature?: number;
        messages: OpenAIChatMessage[];
      }) => Promise<AsyncIterable<OpenAIStreamChunk>>;
    };
  };
};

export async function POST(request: Request) {
  try {
    const {
      messages,
      phase = "",
      projectName,
      memoryEntries,
      memorySummaries,
      artifact,
      artifactContext,
      isRefineMode,
    }: ChatRequestBody = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    const env = validateEnv();

    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
    const streamingOpenAI = openai as unknown as StreamingOpenAIClient;

    const promptMemory = buildPromptMemory({
      messages,
      memoryEntries,
      memorySummaries,
    });

    const normalizedArtifactContext =
      artifactContext ??
      (artifact
        ? {
            ...artifact,
            status: isRefineMode ? "completed" : "draft",
            mode: isRefineMode ? "artifact-follow-up" : "create",
            hasMeaningfulOutput: Boolean(isRefineMode),
            revision: {
              id: "legacy-artifact-revision",
              number: 1,
              createdAt: "",
              status: isRefineMode ? "completed" : "draft",
            },
            evidenceSnapshot:
              artifact.type === "customer-research-memo"
                ? {
                    artifactType: "customer-research-memo",
                    researchStatus: isRefineMode ? "success" : "empty",
                    keyFindings: [],
                    contradictions: [],
                    unansweredQuestions: [],
                    sourceCount: 0,
                    sectionCount: 0,
                  }
                : {
                    artifactType: "validation-scorecard",
                    criteriaCount: 0,
                    scoredCriteriaCount: 0,
                    criteria: [],
                  },
          }
        : null);

    const requestMessages: OpenAIChatMessage[] = [
      {
        role: "system",
        content: buildSystemPrompt(phase, projectName, promptMemory.block, normalizedArtifactContext),
      },
      ...messages.slice(-20).map((message) => ({
        role: message.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: message.content,
      })),
    ];

    const stream = await streamingOpenAI.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      temperature: 0.7,
      messages: requestMessages,
    });

    const encoder = new TextEncoder();
    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;

            if (!content) {
              continue;
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (error) {
          try {
            const message = error instanceof Error ? error.message : "Failed to get AI response";
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
          } catch {
            // Ignore enqueue failures when the client disconnects mid-stream.
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(responseStream, {
      headers: {
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Missing required environment variables:")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Failed to get AI response" }, { status: 500 });
  }
}
