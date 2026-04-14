"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import BrainstormResults from "@/components/BrainstormResults";
import ChatPanel from "@/components/ChatPanel";
import Canvas from "@/components/Canvas";
import FrameworkTemplatePanel from "@/components/FrameworkTemplatePanel";
import ProjectMemoryPanel from "@/components/ProjectMemoryPanel";
import ResearchMemoDualView from "@/components/ResearchMemoDualView";
import UltraplanReport from "@/components/UltraplanReport";
import { useRealtimeProject } from "@/hooks/useRealtimeProject";
import {
  ARTIFACT_CREATED_EVENT,
  ARTIFACT_FOLLOW_UP_EDIT_EVENT,
  WORKSPACE_ARTIFACT_SWITCHED_EVENT,
  trackEvent,
} from "@/lib/analytics";
import { BrainstormResult } from "@/lib/brainstorm";
import { generateProjectDiagram } from "@/lib/diagram-generation";
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
  ProjectArtifact,
  SectionData,
  StickyNoteData,
  ValidationScorecardArtifact,
  WebsiteBuilderData,
  getActiveProjectArtifact,
  getProjectArtifactByType,
  normalizeProject,
} from "@/lib/types";
import {
  applyCustomerResearchMemoUpdate,
  applyValidationScorecardChatUpdate,
  buildArtifactContextPayload,
} from "@/lib/project-artifacts";

function createMessage(sender: "user" | "assistant", content: string): ChatMessage {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`,
    sender,
    content,
    createdAt: new Date().toISOString(),
  };
}

function withGeneratedDiagram(project: Project, options?: { brainstormResult?: BrainstormResult | null }): Project {
  return {
    ...project,
    diagram: generateProjectDiagram(project, options),
  };
}

function getArtifactLabel(artifact: ProjectArtifact) {
  return artifact.type === "customer-research-memo" ? "Customer research memo" : "Validation scorecard";
}

function getArtifactDescription(artifact: ProjectArtifact | null, isRefineMode: boolean) {
  if (!artifact) {
    return "Choose the artifact you want the workspace to update next.";
  }

  if (artifact.type === "customer-research-memo") {
    return isRefineMode
      ? "The workspace is in refine mode for the customer research memo. Use structured follow-ups or freeform chat to resolve contradictions and fill evidence gaps."
      : "Chat and research now work toward the customer research memo, while the canvas keeps supporting context nearby.";
  }

  return isRefineMode
    ? "The workspace is in refine mode for the validation scorecard. Use structured follow-ups or freeform chat to tighten evidence, scores, and next checks."
    : "Chat now works toward the validation scorecard, so you can turn loose notes into explicit evidence, scores, and next checks.";
}

function isArtifactPopulated(artifact: ProjectArtifact | null) {
  if (!artifact) {
    return false;
  }

  if (artifact.type === "validation-scorecard") {
    return Boolean(artifact.summary?.trim()) || artifact.criteria.length > 0;
  }

  return Boolean(artifact.research?.report || artifact.research?.artifact);
}

function getResearchPanelStatus(research: Project["research"], isResearchLoading: boolean) {
  if (isResearchLoading) {
    return "loading" as const;
  }

  if (research?.status === "success" && research.report) {
    return "success" as const;
  }

  if (research?.status === "error") {
    return "error" as const;
  }

  return "empty" as const;
}

function getCustomerResearchMemoArtifactId(project: Project) {
  return getProjectArtifactByType(project, "customer-research-memo")?.id ?? "artifact-customer-research-memo";
}

type WorkspaceSaveState = "saved" | "saving" | "failed";

function WorkspaceSaveStatus({
  state,
  onRetry,
}: {
  state: WorkspaceSaveState;
  onRetry: () => void;
}) {
  const statusLabel = state === "saving" ? "Saving..." : state === "failed" ? "Sync failed" : "Saved";
  const statusClasses =
    state === "saving"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : state === "failed"
        ? "border-rose-200 bg-rose-50 text-rose-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <div className="flex items-center gap-2" aria-live="polite">
      <span
        className={`inline-flex min-h-9 items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${statusClasses}`}
      >
        {statusLabel}
      </span>
      {state === "failed" ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-stone-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

function ValidationScorecardPanel({ artifact }: { artifact: ValidationScorecardArtifact }) {
  return (
    <section className="rounded-[32px] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="rounded-3xl border border-stone-200 bg-[#fcfaf6] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Workspace artifact</div>
        <h2 className="mt-2 text-xl font-semibold text-stone-950">{artifact.title}</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Keep a lightweight scorecard here as you pressure-test demand, customer pull, and next validation steps.
        </p>
      </div>

      <div className="mt-4 rounded-3xl border border-dashed border-stone-300 bg-[#fcfaf6] p-5">
        {artifact.summary ? <p className="text-sm leading-6 text-stone-700">{artifact.summary}</p> : null}
        {artifact.criteria.length > 0 ? (
          <div className="space-y-3">
            {artifact.criteria.map((criterion) => (
              <div key={criterion.id} className="rounded-2xl bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-stone-800">{criterion.label}</p>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                    {typeof criterion.score === "number" ? `${criterion.score}/5` : "Unscored"}
                  </span>
                </div>
                {criterion.notes ? <p className="mt-2 text-sm leading-6 text-stone-600">{criterion.notes}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-stone-600">
              No validation criteria yet. Start using this scorecard to capture the strongest signal, biggest risk, and next validation move.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Problem urgency", "Evidence quality", "Willingness to pay"].map((prompt) => (
                <span
                  key={prompt}
                  className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700"
                >
                  {prompt}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <FrameworkTemplatePanel framework={artifact.framework} heading="Framework template" />
    </section>
  );
}

function ArtifactWorkspaceHeader({
  artifacts,
  activeArtifact,
  isRefineMode,
  onSetActiveArtifact,
}: {
  artifacts: ProjectArtifact[];
  activeArtifact: ProjectArtifact | null;
  isRefineMode: boolean;
  onSetActiveArtifact: (artifactId: string) => void;
}) {
  return (
    <section className="rounded-[32px] border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-[#f4efe7] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Active artifact</div>
            <h2 className="mt-2 text-xl font-semibold text-stone-950">
              {activeArtifact ? getArtifactLabel(activeArtifact) : "Choose an artifact"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
              {getArtifactDescription(activeArtifact, isRefineMode)}
            </p>
          </div>
          {activeArtifact ? (
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-700">
                Workspace target
              </span>
              <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-600">
                {isRefineMode ? "Refine mode" : "Create mode"}
              </span>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {artifacts.map((artifact) => (
            <button
              key={artifact.id}
              type="button"
              onClick={() => onSetActiveArtifact(artifact.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                artifact.id === activeArtifact?.id
                  ? "bg-stone-950 text-white"
                  : "border border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50"
              }`}
              aria-pressed={artifact.id === activeArtifact?.id}
            >
              {getArtifactLabel(artifact)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
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
  const saveRequestSequenceRef = useRef(0);
  const pendingSaveCountRef = useRef(0);
  const latestFailedSnapshotRef = useRef<Project | null>(null);
  const pendingRealtimeRefreshRef = useRef(false);
  const [workspaceSaveState, setWorkspaceSaveState] = useState<WorkspaceSaveState>("saved");

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
        const normalizedProject = withGeneratedDiagram(normalizeProject(storedProject));

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

      const normalizedProject = withGeneratedDiagram(normalizeProject(recoveredProject));

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

  const refreshProjectFromRemote = async () => {
    const remoteProject = await fetchProjectById(projectId);

    if (!remoteProject) {
      return;
    }

    const normalizedProject = withGeneratedDiagram(normalizeProject(remoteProject));

    projectRef.current = normalizedProject;
    setProject(normalizedProject);
    setActivePhaseId((currentPhaseId) =>
      normalizedProject.phases.some((phase) => phase.id === currentPhaseId)
        ? currentPhaseId
        : normalizedProject.phases[0]?.id ?? "getting-started",
    );
  };

  const replayBufferedRealtimeRefresh = (requestId: number) => {
    if (saveRequestSequenceRef.current !== requestId || pendingRealtimeRefreshRef.current === false) {
      return;
    }

    pendingRealtimeRefreshRef.current = false;
    void refreshProjectFromRemote();
  };

  useRealtimeProject(projectId, () => {
    if (savingRef.current) {
      pendingRealtimeRefreshRef.current = true;
      return;
    }

    void refreshProjectFromRemote();
  });

  const persistProject = (nextProject: Project) => {
    const updated = withGeneratedDiagram(normalizeProject({ ...nextProject, updatedAt: new Date().toISOString() }));
    projectRef.current = updated;
    setProject(updated);
    setWorkspaceSaveState("saving");
    savingRef.current = true;
    const requestId = saveRequestSequenceRef.current + 1;
    saveRequestSequenceRef.current = requestId;
    pendingSaveCountRef.current += 1;
    void saveProject(updated)
      .then(() => {
        if (saveRequestSequenceRef.current === requestId) {
          latestFailedSnapshotRef.current = null;
          setWorkspaceSaveState("saved");
          replayBufferedRealtimeRefresh(requestId);
        }
      })
      .catch(() => {
        if (saveRequestSequenceRef.current === requestId) {
          latestFailedSnapshotRef.current = updated;
          setWorkspaceSaveState("failed");
        }
      })
      .finally(() => {
        pendingSaveCountRef.current = Math.max(0, pendingSaveCountRef.current - 1);
        savingRef.current = pendingSaveCountRef.current > 0;
      });
  };

  const handleRetrySave = () => {
    const latestFailedSnapshot = latestFailedSnapshotRef.current;

    if (!latestFailedSnapshot) {
      return;
    }

    persistProject(latestFailedSnapshot);
  };

  const activePhase = useMemo(
    () => project?.phases.find((phase) => phase.id === activePhaseId) ?? project?.phases[0] ?? null,
    [activePhaseId, project?.phases],
  );
  const generatedDiagram = useMemo(
    () => (project ? generateProjectDiagram(project, { brainstormResult }) : undefined),
    [brainstormResult, project],
  );
  const activeArtifact = useMemo(() => (project ? getActiveProjectArtifact(project) : null), [project]);
  const activeResearchMemo = activeArtifact?.type === "customer-research-memo" ? activeArtifact : null;
  const activeArtifactHasOutput = useMemo(() => isArtifactPopulated(activeArtifact), [activeArtifact]);
  const activeArtifactChatMode = activeArtifactHasOutput ? "artifact-follow-up" : "create";

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

    const artifactAtSend = getActiveProjectArtifact(currentProject);
    const artifactWasPopulated = isArtifactPopulated(artifactAtSend);

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
          artifactContext: buildArtifactContextPayload({
            ...currentProject,
            activeArtifactId: artifactAtSend?.id ?? currentProject.activeArtifactId,
          }),
          isRefineMode: artifactWasPopulated,
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

      if (assistantContent.trim() && artifactAtSend?.type === "validation-scorecard") {
        const baseProject = projectRef.current;

        if (baseProject) {
          const scorecardUpdate = applyValidationScorecardChatUpdate(
            baseProject,
            assistantContent,
            new Date().toISOString(),
          );

          if (scorecardUpdate.changed) {
            persistProject(scorecardUpdate.project);
          }
        }
      }

      if (assistantContent.trim() && artifactAtSend) {
        void trackEvent(artifactWasPopulated ? ARTIFACT_FOLLOW_UP_EDIT_EVENT : ARTIFACT_CREATED_EVENT, {
          page: `/project/${projectId}`,
          project_id: projectId,
          artifact_id: artifactAtSend.id,
          artifact_type: artifactAtSend.type,
          source: "chat",
        });
      }
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

  const handleDiagramChange = (diagram: NonNullable<Project["diagram"]>) => {
    if (!project) {
      return;
    }

    persistProject({ ...project, diagram });
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
    const memoArtifactId = getCustomerResearchMemoArtifactId(currentProject);
    const existingMemoArtifact = getProjectArtifactByType(currentProject, "customer-research-memo") ?? null;
    const memoWasPopulated = isArtifactPopulated(existingMemoArtifact);
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
          const nextResearch = {
            status: "error" as const,
            errorMessage: result.errorMessage ?? "Failed to run deep research",
            researchQuestion,
            sourceContext,
            updatedAt: displayedReportUpdatedAt,
            artifact: result.artifact,
            report: result.report,
          };
          const memoUpdate = applyCustomerResearchMemoUpdate(baseProject, nextResearch);

          persistProject({
            ...memoUpdate.project,
            messages: [
              ...memoUpdate.project.messages,
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
      const nextResearch = {
        status: "success" as const,
        artifact: result.artifact,
        report,
        researchQuestion: report.researchQuestion,
        sourceContext,
        updatedAt: report.generatedAt,
      };
      const memoUpdate = applyCustomerResearchMemoUpdate(latestProject, nextResearch);

      persistProject(memoUpdate.project);
      void trackEvent(memoWasPopulated ? ARTIFACT_FOLLOW_UP_EDIT_EVENT : ARTIFACT_CREATED_EVENT, {
        page: `/project/${projectId}`,
        project_id: projectId,
        artifact_id: memoArtifactId,
        artifact_type: "customer-research-memo",
        source: "research",
      });
    } catch (error) {
      const baseProject = projectRef.current ?? currentProject;

      if (baseProject) {
        const nextResearch = {
          status: "error" as const,
          errorMessage: error instanceof Error ? error.message : "Failed to run deep research",
          researchQuestion,
          sourceContext,
          updatedAt: new Date().toISOString(),
          artifact: existingResearch?.artifact,
          report: existingResearch?.report,
        };
        const memoUpdate = applyCustomerResearchMemoUpdate(baseProject, nextResearch);

        persistProject({
          ...memoUpdate.project,
          messages: [
            ...memoUpdate.project.messages,
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

    /* v8 ignore next -- defensive guard during transient load states */
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

  const handleSetActiveArtifact = (artifactId: string) => {
    /* v8 ignore next -- defensive guard during transient load states */
    if (!project) {
      return;
    }

    const previousArtifact = getActiveProjectArtifact(project);
    const nextArtifact = project.artifacts?.find((artifact) => artifact.id === artifactId) ?? null;

    if (!nextArtifact || previousArtifact?.id === nextArtifact.id) {
      return;
    }

    persistProject({
      ...project,
      activeArtifactId: artifactId,
    });
    void trackEvent(WORKSPACE_ARTIFACT_SWITCHED_EVENT, {
      page: `/project/${projectId}`,
      project_id: projectId,
      artifact_id: nextArtifact.id,
      artifact_type: nextArtifact.type,
      previous_artifact_id: previousArtifact?.id ?? null,
      previous_artifact_type: previousArtifact?.type ?? null,
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
                aria-label="Project name"
                className="mt-1 w-full min-w-0 border-none bg-transparent p-0 text-2xl font-semibold text-stone-950 outline-none sm:min-w-[320px]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <WorkspaceSaveStatus state={workspaceSaveState} onRetry={handleRetrySave} />
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

        <ArtifactWorkspaceHeader
          artifacts={project.artifacts ?? []}
          activeArtifact={activeArtifact}
          isRefineMode={activeArtifactHasOutput}
          onSetActiveArtifact={handleSetActiveArtifact}
        />

        <div className="hidden gap-4 md:grid md:grid-cols-[minmax(0,40%)_minmax(0,60%)]">
          <ChatPanel
            messages={project.messages}
            phases={project.phases}
            activePhaseId={activePhaseId}
            activeArtifactLabel={activeArtifact ? getArtifactLabel(activeArtifact) : "Artifact"}
            activeArtifactType={activeArtifact?.type ?? "validation-scorecard"}
            activeArtifactHasOutput={activeArtifactHasOutput}
            activeArtifactChatMode={activeArtifactChatMode}
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
            {activeArtifact?.type === "validation-scorecard" ? (
              <ValidationScorecardPanel artifact={activeArtifact} />
            ) : (
              <ResearchMemoDualView
                artifact={activeResearchMemo}
                status={getResearchPanelStatus(activeResearchMemo?.research ?? project.research, isResearchLoading)}
                report={activeResearchMemo?.research?.report ?? project.research?.report ?? null}
                errorMessage={activeResearchMemo?.research?.errorMessage ?? project.research?.errorMessage}
                lastUpdatedAt={activeResearchMemo?.research?.updatedAt ?? project.research?.updatedAt}
                researchQuestion={activeResearchMemo?.research?.researchQuestion ?? project.research?.researchQuestion}
                sourceContext={activeResearchMemo?.research?.sourceContext ?? project.research?.sourceContext}
                researchArtifact={activeResearchMemo?.research?.artifact ?? project.research?.artifact}
                onRunResearch={handleResearch}
              />
            )}
            <ProjectMemoryPanel project={project} />
            {ultraplanResult ? <UltraplanReport result={ultraplanResult} /> : null}
            {brainstormResult ? <BrainstormResults result={brainstormResult} /> : null}
            <div className="rounded-[32px] border border-stone-200 bg-white p-3 shadow-sm">
              <Canvas
                notes={project.notes}
                sections={project.sections ?? []}
                documents={project.documents ?? []}
                websiteBuilders={project.websiteBuilders ?? []}
                diagram={generatedDiagram}
                onChangeNotes={handleNotesChange}
                onChangeSections={handleSectionsChange}
                onChangeDocuments={handleDocumentsChange}
                onChangeWebsiteBuilders={handleWebsiteBuildersChange}
                onChangeDiagram={handleDiagramChange}
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
              activeArtifactLabel={activeArtifact ? getArtifactLabel(activeArtifact) : "Artifact"}
              activeArtifactType={activeArtifact?.type ?? "validation-scorecard"}
              activeArtifactHasOutput={activeArtifactHasOutput}
              activeArtifactChatMode={activeArtifactChatMode}
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
              {activeArtifact?.type === "validation-scorecard" ? (
                <ValidationScorecardPanel artifact={activeArtifact} />
              ) : (
                <ResearchMemoDualView
                  artifact={activeResearchMemo}
                  status={getResearchPanelStatus(activeResearchMemo?.research ?? project.research, isResearchLoading)}
                  report={activeResearchMemo?.research?.report ?? project.research?.report ?? null}
                  errorMessage={activeResearchMemo?.research?.errorMessage ?? project.research?.errorMessage}
                  lastUpdatedAt={activeResearchMemo?.research?.updatedAt ?? project.research?.updatedAt}
                  researchQuestion={activeResearchMemo?.research?.researchQuestion ?? project.research?.researchQuestion}
                  sourceContext={activeResearchMemo?.research?.sourceContext ?? project.research?.sourceContext}
                  researchArtifact={activeResearchMemo?.research?.artifact ?? project.research?.artifact}
                  onRunResearch={handleResearch}
                />
              )}
              <ProjectMemoryPanel project={project} />
              {ultraplanResult ? <UltraplanReport result={ultraplanResult} /> : null}
              {brainstormResult ? <BrainstormResults result={brainstormResult} /> : null}
              <div className="rounded-[32px] border border-stone-200 bg-white p-3 shadow-sm">
                <Canvas
                  notes={project.notes}
                  sections={project.sections ?? []}
                  documents={project.documents ?? []}
                  websiteBuilders={project.websiteBuilders ?? []}
                  diagram={generatedDiagram}
                  onChangeNotes={handleNotesChange}
                  onChangeSections={handleSectionsChange}
                  onChangeDocuments={handleDocumentsChange}
                  onChangeWebsiteBuilders={handleWebsiteBuildersChange}
                  onChangeDiagram={handleDiagramChange}
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
