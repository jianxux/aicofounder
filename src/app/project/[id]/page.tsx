"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import ChatPanel from "@/components/ChatPanel";
import Canvas from "@/components/Canvas";
import { createProjectRecord, getProjectById, upsertProject } from "@/lib/projects";
import { ChatMessage, Project, StickyNoteData } from "@/lib/types";

function createMessage(sender: "user" | "assistant", content: string): ChatMessage {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`,
    sender,
    content,
    createdAt: new Date().toISOString(),
  };
}

export default function ProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;
  const [project, setProject] = useState<Project | null>(null);
  const [activePhaseId, setActivePhaseId] = useState("getting-started");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const requestControllerRef = useRef<AbortController | null>(null);
  const projectRef = useRef<Project | null>(null);

  useEffect(() => {
    const storedProject = getProjectById(projectId);

    if (storedProject) {
      projectRef.current = storedProject;
      setProject(storedProject);
      setActivePhaseId(storedProject.phases[0]?.id ?? "getting-started");
      return;
    }

    const fallbackProject = createProjectRecord();
    const recoveredProject = { ...fallbackProject, id: projectId, updatedAt: new Date().toISOString() };
    upsertProject(recoveredProject);
    projectRef.current = recoveredProject;
    setProject(recoveredProject);
    setActivePhaseId(recoveredProject.phases[0]?.id ?? "getting-started");
  }, [projectId]);

  useEffect(() => {
    return () => {
      requestControllerRef.current?.abort();
    };
  }, []);

  const persistProject = (nextProject: Project) => {
    const updated = { ...nextProject, updatedAt: new Date().toISOString() };
    projectRef.current = updated;
    setProject(updated);
    upsertProject(updated);
  };

  const activePhase = useMemo(
    () => project?.phases.find((phase) => phase.id === activePhaseId) ?? project?.phases[0] ?? null,
    [activePhaseId, project?.phases],
  );

  const handleNameChange = (name: string) => {
    if (!project) {
      return;
    }

    persistProject({ ...project, name });
  };

  const handleSendMessage = async (content: string) => {
    const currentProject = projectRef.current;

    if (!currentProject) {
      return;
    }

    const userMessage = createMessage("user", content);
    const assistantMessage = createMessage("assistant", "");
    const nextMessages = [...currentProject.messages, userMessage, assistantMessage];

    setIsLoading(true);
    persistProject({ ...currentProject, messages: nextMessages });

    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: nextMessages }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to send chat message");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let buffer = "";

      const applyAssistantContent = (nextContent: string) => {
        const baseProject = projectRef.current;

        if (!baseProject) {
          return;
        }

        persistProject({
          ...baseProject,
          messages: baseProject.messages.map((message) =>
            message.id === assistantMessage.id ? { ...message, content: nextContent } : message,
          ),
        });
      };

      const processChunk = (chunkText: string) => {
        buffer += chunkText;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) {
            continue;
          }

          const payload = line.slice(6);

          if (payload === "[DONE]") {
            continue;
          }

          const data = JSON.parse(payload) as { content?: string };
          const delta = data.content;

          if (!delta) {
            continue;
          }

          assistantContent += delta;
          applyAssistantContent(assistantContent);
        }
      };

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        processChunk(decoder.decode(value, { stream: true }));
      }

      processChunk(decoder.decode());
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      const baseProject = projectRef.current;

      if (baseProject) {
        persistProject({
          ...baseProject,
          messages: baseProject.messages.map((message) =>
            message.id === assistantMessage.id
              ? { ...message, content: "Sorry, I encountered an error. Please try again." }
              : message,
          ),
        });
      }
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }

      setIsLoading(false);
    }
  };

  const handleRemind = () => {
    if (!project || !activePhase) {
      return;
    }

    const completed = activePhase.tasks.filter((task) => task.done).length;
    const reminder = createMessage(
      "assistant",
      `We were working on ${activePhase.title.toLowerCase()}. You’ve completed ${completed} of ${activePhase.tasks.length} tasks in this phase, and the latest notes are on the canvas to the right.`,
    );

    persistProject({
      ...project,
      messages: [...project.messages, reminder],
    });
  };

  const handleNotesChange = (notes: StickyNoteData[]) => {
    if (!project) {
      return;
    }

    persistProject({ ...project, notes });
  };

  const handleToggleTask = (phaseId: string, taskId: string) => {
    if (!project) {
      return;
    }

    const phases = project.phases.map((phase) =>
      phase.id === phaseId
        ? {
            ...phase,
            tasks: phase.tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)),
          }
        : phase,
    );

    const currentPhase = phases.find((phase) => phase.id === phaseId) ?? phases[0];

    persistProject({
      ...project,
      phases,
      phase: currentPhase.title,
    });
  };

  const handleSetActivePhase = (phaseId: string) => {
    setActivePhaseId(phaseId);

    if (!project) {
      return;
    }

    const currentPhase = project.phases.find((phase) => phase.id === phaseId);

    if (!currentPhase) {
      return;
    }

    persistProject({
      ...project,
      phase: currentPhase.title,
    });
  };

  if (!project) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf7f2] px-6">
        <div className="rounded-3xl border border-stone-200 bg-white px-8 py-6 text-sm text-stone-600 shadow-sm">
          Loading project workspace...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf7f2] px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-[28px] border border-stone-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 text-lg text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
              aria-label="Back to dashboard"
            >
              ←
            </button>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Project workspace</div>
              <input
                value={project.name}
                onChange={(event) => handleNameChange(event.target.value)}
                className="mt-1 w-full min-w-0 border-none bg-transparent p-0 text-2xl font-semibold text-stone-950 outline-none sm:min-w-[320px]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
            >
              Export
            </button>
            <button
              type="button"
              className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
            >
              Share
            </button>
            <Link
              href="/dashboard"
              className="rounded-full bg-stone-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,40%)_minmax(0,60%)]">
          <ChatPanel
            messages={project.messages}
            phases={project.phases}
            activePhaseId={activePhaseId}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            onRemind={handleRemind}
            onToggleTask={handleToggleTask}
            onSetActivePhase={handleSetActivePhase}
          />
          <div className="rounded-[32px] border border-stone-200 bg-white p-3 shadow-sm">
            <Canvas notes={project.notes} onChangeNotes={handleNotesChange} />
          </div>
        </div>
      </div>
    </main>
  );
}
