"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import BrainstormResults from "@/components/BrainstormResults";
import ChatPanel from "@/components/ChatPanel";
import Canvas from "@/components/Canvas";
import ResearchReport from "@/components/ResearchReport";
import UltraplanReport from "@/components/UltraplanReport";
import { useRealtimeProject } from "@/hooks/useRealtimeProject";
import { trackEvent } from "@/lib/analytics";
import { BrainstormResult } from "@/lib/brainstorm";
import { getNextPhaseId, getPhaseAdvanceMessage, shouldAdvancePhase } from "@/lib/phases";
import { resolveProjectResearchResponse, type ResearchApiFailure, type ResearchApiSuccess } from "@/lib/project-research";
import { createProjectRecord, getProject, saveProject, upsertProject } from "@/lib/projects";
import { fetchProjectById } from "@/lib/supabase-projects";
import { UltraplanResult } from "@/lib/ultraplan";
import {
  ChatMessage,
  DocumentCardData,
  Phase,
  Project,
  SectionData,
  StickyNoteData,
  WebsiteBuilderData,
} from "@/lib/types";

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
  const [activePanel, setActivePanel] = useState<"chat" | "canvas">("chat");
  const [activePhaseId, setActivePhaseId] = useState("getting-started");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isResearchLoading, setIsResearchLoading] = useState(false);
  const [brainstormResult, setBrainstormResult] = useState<BrainstormResult | null>(null);
  const [ultraplanResult, setUltraplanResult] = useState<UltraplanResult | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const projectRef = useRef<Project | null>(null);
  const savingRef = useRef(false);

  const normalizeProject = (value: Project): Project => ({
    ...value,
    sections: value.sections ?? [],
    documents: value.documents ?? [],
    websiteBuilders: value.websiteBuilders ?? [],
    research: value.research ?? null,
  });

  const buildResearchContext = (currentProject: Project, phase: Phase | null) => {
    const latestUserMessage = [...currentProject.messages]
      .reverse()
      .find((message) => message.sender === "user" && message.content.trim());

    if (latestUserMessage) {
      return {
        sourceContext: latestUserMessage.content,
        researchQuestion: "What are the key opportunities and risks?",
      };
    }

    const incompleteTasks = phase?.tasks.filter((task) => !task.done).map((task) => task.label) ?? [];
    const taskContext =
      incompleteTasks.length > 0
        ? `Open tasks: ${incompleteTasks.join(", ")}.`
        : "No open tasks are listed for this phase yet.";
    const sourceContext = `Current phase: ${phase?.title ?? "Getting started"}. ${taskContext}`;

    return {
      sourceContext,
      researchQuestion: `What are the key opportunities and risks for the ${phase?.title ?? "Getting started"} phase?`,
    };
  };

  useEffect(() => {
    void trackEvent("workspace_view", {
      page: `/project/${projectId}`,
      project_id: projectId,
    });

    let isMounted = true;

    const loadProject = async () => {
      const storedProject = await getProject(projectId);

      if (storedProject) {
        const normalizedProject = normalizeProject(storedProject);

        if (!isMounted) {
          return;
        }

        projectRef.current = normalizedProject;
        setProject(normalizedProject);
        setActivePhaseId(normalizedProject.phases[0]?.id ?? "getting-started");
        return;
      }

      const fallbackProject = createProjectRecord();
      const recoveredProject = { ...fallbackProject, id: projectId, updatedAt: new Date().toISOString() };
      upsertProject(recoveredProject);

      if (!isMounted) {
        return;
      }

      const normalizedProject = normalizeProject(recoveredProject);

      projectRef.current = normalizedProject;
      setProject(normalizedProject);
      setActivePhaseId(normalizedProject.phases[0]?.id ?? "getting-started");
    };

    void loadProject();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  useEffect(() => {
    return () => {
      requestControllerRef.current?.abort();
    };
  }, []);

  useRealtimeProject(projectId, () => {
    if (savingRef.current) {
      return;
    }

    void (async () => {
      const remoteProject = await fetchProjectById(projectId);

      if (!remoteProject) {
        return;
      }

      const normalizedProject = normalizeProject(remoteProject);

      projectRef.current = normalizedProject;
      setProject(normalizedProject);
      setActivePhaseId((currentPhaseId) =>
        normalizedProject.phases.some((phase) => phase.id === currentPhaseId)
          ? currentPhaseId
          : normalizedProject.phases[0]?.id ?? "getting-started",
      );
    })();
  });

  const persistProject = (nextProject: Project) => {
    const updated = { ...nextProject, updatedAt: new Date().toISOString() };
    projectRef.current = updated;
    setProject(updated);
    savingRef.current = true;
    void saveProject(updated).finally(() => {
      savingRef.current = false;
    });
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

    void trackEvent("message_sent", {
      page: `/project/${projectId}`,
      project_id: projectId,
      message_length: content.length,
      phase_id: activePhaseId,
    });

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
        body: JSON.stringify({
          messages: nextMessages,
          phase: activePhaseId,
          projectName: currentProject.name,
        }),
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

  const handleDocumentsChange = (documents: DocumentCardData[]) => {
    if (!project) {
      return;
    }

    persistProject({ ...project, documents });
  };

  const handleSectionsChange = (sections: SectionData[]) => {
    if (!project) {
      return;
    }

    persistProject({ ...project, sections });
  };

  const handleWebsiteBuildersChange = (websiteBuilders: WebsiteBuilderData[]) => {
    if (!project) {
      return;
    }

    persistProject({ ...project, websiteBuilders });
  };

  const handleNoteCreated = (note: StickyNoteData) => {
    void trackEvent("note_created", {
      page: `/project/${projectId}`,
      project_id: projectId,
      note_id: note.id,
      color: note.color,
    });
  };

  const handleNoteDragged = (note: StickyNoteData) => {
    void trackEvent("note_dragged", {
      page: `/project/${projectId}`,
      project_id: projectId,
      note_id: note.id,
      x: Math.round(note.x),
      y: Math.round(note.y),
    });
  };

  const handleBrainstorm = async () => {
    const currentProject = projectRef.current;

    if (!currentProject || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const latestUserMessage = [...currentProject.messages]
        .reverse()
        .find((message) => message.sender === "user" && message.content.trim());

      const response = await fetch("/api/brainstorm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectName: currentProject.name,
          projectDescription:
            latestUserMessage?.content ?? `Current phase: ${activePhase?.title ?? "Getting started"}`,
          focusArea: activePhase?.title,
        }),
      });

      const payload = (await response.json()) as BrainstormResult | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error("Failed to brainstorm pain points");
      }

      setBrainstormResult(payload);
    } catch {
      const baseProject = projectRef.current;

      if (baseProject) {
        persistProject({
          ...baseProject,
          messages: [
            ...baseProject.messages,
            createMessage("assistant", "Sorry, I couldn't brainstorm pain points right now. Please try again."),
          ],
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResearch = async () => {
    const currentProject = projectRef.current;

    if (!currentProject || isLoading) {
      return;
    }

    setActivePanel("canvas");
    setIsLoading(true);
    setIsResearchLoading(true);

    const existingResearch = currentProject.research;
    const { sourceContext, researchQuestion } = buildResearchContext(currentProject, activePhase);

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectName: currentProject.name,
          projectDescription: sourceContext,
          researchQuestion,
        }),
      });

      const payload = (await response.json()) as ResearchApiSuccess | ResearchApiFailure;
      const result = resolveProjectResearchResponse(existingResearch, payload, response.ok);
      const displayedReportUpdatedAt = result.report?.generatedAt ?? existingResearch?.updatedAt ?? new Date().toISOString();

      if (!result.ok) {
        const baseProject = projectRef.current ?? currentProject;

        if (baseProject) {
          persistProject({
            ...baseProject,
            research: {
              status: "error",
              errorMessage: result.errorMessage ?? "Failed to run deep research",
              researchQuestion,
              sourceContext,
              updatedAt: displayedReportUpdatedAt,
              artifact: result.artifact,
              report: result.report,
            },
            messages: [
              ...baseProject.messages,
              createMessage("assistant", "Sorry, I couldn't run deep research right now. Please try again."),
            ],
          });
        }

        return;
      }

      const report = result.report;

      if (!report) {
        throw new Error("Failed to parse deep research report");
      }

      const latestProject = projectRef.current ?? currentProject;
      const nextProject = {
        ...latestProject,
        research: {
          status: "success" as const,
          artifact: result.artifact,
          report,
          researchQuestion: report.researchQuestion,
          sourceContext,
          updatedAt: report.generatedAt,
        },
      };

      persistProject(nextProject);
    } catch (error) {
      const baseProject = projectRef.current ?? currentProject;

      if (baseProject) {
        persistProject({
          ...baseProject,
          research: {
            status: "error",
            errorMessage: error instanceof Error ? error.message : "Failed to run deep research",
            researchQuestion,
            sourceContext,
            updatedAt: new Date().toISOString(),
            artifact: existingResearch?.artifact,
            report: existingResearch?.report,
          },
          messages: [
            ...baseProject.messages,
            createMessage("assistant", "Sorry, I couldn't run deep research right now. Please try again."),
          ],
        });
      }
    } finally {
      setIsResearchLoading(false);
      setIsLoading(false);
    }
  };

  const handleUltraplan = async () => {
    const currentProject = projectRef.current;

    if (!currentProject || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const userMessages = currentProject.messages.filter(
        (message) => message.sender === "user" && message.content.trim(),
      );
      const latestUserMessage = userMessages[userMessages.length - 1];

      const response = await fetch("/api/ultraplan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectName: currentProject.name,
          projectDescription: latestUserMessage?.content ?? activePhase?.title ?? "Getting started",
          currentPhase: activePhase?.title,
          completedTasks: activePhase?.tasks.filter((task) => task.done).length ?? 0,
          totalTasks: activePhase?.tasks.length ?? 0,
          recentMessages: userMessages.slice(-5).map((message) => message.content),
        }),
      });

      const payload = (await response.json()) as UltraplanResult | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error("Failed to create ultraplan");
      }

      setUltraplanResult(payload);
    } catch {
      const baseProject = projectRef.current;

      if (baseProject) {
        persistProject({
          ...baseProject,
          messages: [
            ...baseProject.messages,
            createMessage("assistant", "Sorry, I couldn't create an ultraplan right now. Please try again."),
          ],
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTask = (phaseId: string, taskId: string) => {
    if (!project) {
      return;
    }

    const updatedPhases = project.phases.map((phase) =>
      phase.id === phaseId
        ? {
            ...phase,
            tasks: phase.tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)),
          }
        : phase,
    );

    if (shouldAdvancePhase(updatedPhases, phaseId)) {
      const nextPhaseId = getNextPhaseId(updatedPhases, phaseId);
      const completedPhase = updatedPhases.find((phase) => phase.id === phaseId);
      const nextPhase = updatedPhases.find((phase) => phase.id === nextPhaseId);

      if (nextPhaseId && completedPhase && nextPhase) {
        setActivePhaseId(nextPhaseId);
        persistProject({
          ...project,
          phases: updatedPhases,
          phase: nextPhase.title,
          messages: [
            ...project.messages,
            createMessage("assistant", getPhaseAdvanceMessage(completedPhase.title, nextPhase.title)),
          ],
        });
        return;
      }
    }

    const currentPhase = updatedPhases.find((phase) => phase.id === phaseId) ?? updatedPhases[0];

    persistProject({
      ...project,
      phases: updatedPhases,
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

        <div className="md:hidden">
          <div className="inline-flex gap-2 rounded-full bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => setActivePanel("chat")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activePanel === "chat"
                  ? "bg-stone-950 text-white"
                  : "bg-transparent text-stone-600 hover:bg-stone-100"
              }`}
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => setActivePanel("canvas")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activePanel === "canvas"
                  ? "bg-stone-950 text-white"
                  : "bg-transparent text-stone-600 hover:bg-stone-100"
              }`}
            >
              Canvas
            </button>
          </div>
        </div>

        <div className="hidden gap-4 md:grid md:grid-cols-[minmax(0,40%)_minmax(0,60%)]">
          <ChatPanel
            messages={project.messages}
            phases={project.phases}
            activePhaseId={activePhaseId}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            onRemind={handleRemind}
            onBrainstorm={handleBrainstorm}
            onResearch={handleResearch}
            onUltraplan={handleUltraplan}
            onToggleTask={handleToggleTask}
            onSetActivePhase={handleSetActivePhase}
          />
          <div className="flex flex-col gap-4">
            <ResearchReport
              status={
                isResearchLoading
                  ? "loading"
                  : project.research?.status === "success" && project.research.report
                    ? "success"
                    : project.research?.status === "error"
                      ? "error"
                      : "empty"
              }
              report={project.research?.report ?? null}
              errorMessage={project.research?.errorMessage}
              lastUpdatedAt={project.research?.updatedAt}
              researchQuestion={project.research?.researchQuestion}
              sourceContext={project.research?.sourceContext}
              artifact={project.research?.artifact}
              onRunResearch={handleResearch}
            />
            {ultraplanResult ? <UltraplanReport result={ultraplanResult} /> : null}
            {brainstormResult ? <BrainstormResults result={brainstormResult} /> : null}
            <div className="rounded-[32px] border border-stone-200 bg-white p-3 shadow-sm">
              <Canvas
                notes={project.notes}
                sections={project.sections ?? []}
                documents={project.documents ?? []}
                websiteBuilders={project.websiteBuilders ?? []}
                onChangeNotes={handleNotesChange}
                onChangeSections={handleSectionsChange}
                onChangeDocuments={handleDocumentsChange}
                onChangeWebsiteBuilders={handleWebsiteBuildersChange}
                onNoteCreated={handleNoteCreated}
                onNoteDragged={handleNoteDragged}
              />
            </div>
          </div>
        </div>

        <div className="md:hidden">
          {activePanel === "chat" ? (
            <ChatPanel
              className="min-h-[calc(100vh-13rem)]"
              messages={project.messages}
              phases={project.phases}
              activePhaseId={activePhaseId}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              onRemind={handleRemind}
              onBrainstorm={handleBrainstorm}
              onResearch={handleResearch}
              onUltraplan={handleUltraplan}
              onToggleTask={handleToggleTask}
              onSetActivePhase={handleSetActivePhase}
            />
          ) : (
            <div className="flex flex-col gap-4">
              <ResearchReport
                status={
                  isResearchLoading
                    ? "loading"
                    : project.research?.status === "success" && project.research.report
                      ? "success"
                      : project.research?.status === "error"
                        ? "error"
                        : "empty"
                }
                report={project.research?.report ?? null}
                errorMessage={project.research?.errorMessage}
                lastUpdatedAt={project.research?.updatedAt}
                researchQuestion={project.research?.researchQuestion}
                sourceContext={project.research?.sourceContext}
                artifact={project.research?.artifact}
                onRunResearch={handleResearch}
              />
              {ultraplanResult ? <UltraplanReport result={ultraplanResult} /> : null}
              {brainstormResult ? <BrainstormResults result={brainstormResult} /> : null}
              <div className="rounded-[32px] border border-stone-200 bg-white p-3 shadow-sm">
                <Canvas
                  notes={project.notes}
                  sections={project.sections ?? []}
                  documents={project.documents ?? []}
                  websiteBuilders={project.websiteBuilders ?? []}
                  onChangeNotes={handleNotesChange}
                  onChangeSections={handleSectionsChange}
                  onChangeDocuments={handleDocumentsChange}
                  onChangeWebsiteBuilders={handleWebsiteBuildersChange}
                  onNoteCreated={handleNoteCreated}
                  onNoteDragged={handleNoteDragged}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
