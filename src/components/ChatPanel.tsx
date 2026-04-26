"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ArtifactRefinementForm from "@/components/ArtifactRefinementForm";
import PhaseTracker from "@/components/PhaseTracker";
import { ChatMessage, Phase, WorkspaceArtifactChatMode } from "@/lib/types";

type ChatPanelProps = {
  messages: ChatMessage[];
  phases: Phase[];
  activePhaseId: string;
  activeArtifactLabel: string;
  activeArtifactType: "validation-scorecard" | "customer-research-memo";
  activeArtifactHasOutput: boolean;
  activeArtifactChatMode: WorkspaceArtifactChatMode;
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onRemind: () => void;
  onBrainstorm: () => void;
  onResearch?: () => void;
  onUltraplan?: () => void;
  onToggleTask: (phaseId: string, taskId: string) => void;
  onSetActivePhase: (phaseId: string) => void;
  className?: string;
};

export default function ChatPanel({
  messages,
  phases,
  activePhaseId,
  activeArtifactLabel,
  activeArtifactType,
  activeArtifactHasOutput,
  activeArtifactChatMode,
  onSendMessage,
  isLoading,
  onRemind,
  onBrainstorm,
  onResearch,
  onUltraplan,
  onToggleTask,
  onSetActivePhase,
  className,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const messagesRegionRef = useRef<HTMLDivElement | null>(null);

  const activePhase = useMemo(
    () => phases.find((phase) => phase.id === activePhaseId) ?? phases[0],
    [activePhaseId, phases],
  );
  const isResearchMemoActive = activeArtifactType === "customer-research-memo";
  const isFollowUpMode = activeArtifactChatMode === "artifact-follow-up";
  const isRefineMode = activeArtifactHasOutput;
  const headerTitle = isResearchMemoActive
    ? isFollowUpMode
      ? "Ask about the customer research memo"
      : "Build the customer research memo"
    : isFollowUpMode
      ? "Ask about the validation scorecard"
      : "Build the validation scorecard";
  const headerCopy = isResearchMemoActive
    ? isFollowUpMode
      ? "Freeform chat now stays grounded in the active memo revision so you can ask about findings, contradictions, and the next evidence to gather."
      : "Use chat to capture findings, pressure-test assumptions, and build the first grounded customer research memo."
    : isFollowUpMode
      ? "Freeform chat now stays grounded in the active scorecard revision so you can question evidence, challenge scores, and sharpen the next validation move."
      : "Use chat to define evidence, scores, and open questions so the validation scorecard stays decision-ready.";
  const placeholder = isResearchMemoActive
    ? isFollowUpMode
      ? "Ask about this memo, its contradictions, or the next research move..."
      : "Add findings, contradictions, or next questions for the customer research memo..."
    : isFollowUpMode
      ? "Ask about this scorecard, challenge a score, or request the next validation step..."
      : "Add evidence, scores, or next validation checks for the scorecard...";
  const sendLabel = isResearchMemoActive
    ? isFollowUpMode
      ? "Ask about memo"
      : "Update memo"
    : isFollowUpMode
      ? "Ask about scorecard"
      : "Update scorecard";
  const modeLabel = isFollowUpMode ? "Artifact follow-up" : "Create mode";
  const starterPrompts = useMemo(() => {
    if (isResearchMemoActive) {
      return isFollowUpMode
        ? [
            "What contradictions in this memo need to be resolved first?",
            "Which missing evidence would most improve this memo?",
            "Turn these findings into the next customer interview plan.",
          ]
        : [
            "Summarize the strongest customer signals we should capture in this memo.",
            "What open questions should guide the next round of interviews?",
            "Draft the next research move that would sharpen this memo fastest.",
          ];
    }

    return isFollowUpMode
      ? [
          "What score in this scorecard needs the strongest challenge right now?",
          "Which evidence gap is keeping this scorecard from being decision-ready?",
          "Turn this scorecard into the next validation experiment plan.",
        ]
      : [
          "Summarize the strongest evidence we already have for this scorecard.",
          "What assumptions should we validate before locking any scores?",
          "Draft the next validation step that would most reduce risk.",
        ];
  }, [isFollowUpMode, isResearchMemoActive]);
  const isDraftEmpty = !draft.trim();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isDraftEmpty) {
      return;
    }

    onSendMessage(draft.trim());
    setDraft("");
  };

  const lastMessage = messages[messages.length - 1];
  const lastMessageId = lastMessage?.id;
  const lastMessageContent = lastMessage?.content;

  useEffect(() => {
    const region = messagesRegionRef.current;
    if (!region) {
      return;
    }

    if (typeof region.scrollTo === "function") {
      region.scrollTo({ top: region.scrollHeight });
    } else {
      region.scrollTop = region.scrollHeight;
    }
  }, [messages.length, lastMessageId, lastMessageContent, isLoading]);

  return (
    <div
      className={`flex h-full min-h-[720px] w-full flex-col rounded-[28px] border border-stone-200 bg-white shadow-sm ${
        className ?? ""
      }`}
    >
      <div className="border-b border-stone-200 px-6 py-5">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">AI Cofounder</div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-[#f4efe7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-700">
            Active artifact
          </span>
          <span className="text-sm font-medium text-stone-700">{activeArtifactLabel}</span>
          <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-600">
            {modeLabel}
          </span>
        </div>
        <h2 className="mt-3 text-2xl font-semibold text-stone-900">{headerTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          {headerCopy}
        </p>
      </div>

      <div
        ref={messagesRegionRef}
        data-testid="chat-messages-region"
        className="flex-1 space-y-4 overflow-y-auto px-6 py-5"
      >
        {messages.map((message) => {
          const isUser = message.sender === "user";

          return (
            <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${
                  isUser ? "bg-sky-600 text-white" : "bg-stone-100 text-stone-800"
                }`}
              >
                <div className="whitespace-pre-wrap">
                  {message.content}
                </div>
              </div>
            </div>
          );
        })}
        {isLoading ? (
          <div className="flex justify-start" aria-label="AI is thinking">
            <div className="flex items-center gap-2 rounded-3xl bg-stone-100 px-4 py-3 shadow-sm">
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.3s]" />
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.15s]" />
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-stone-400" />
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-stone-200 px-6 py-5">
        {isRefineMode ? (
          <ArtifactRefinementForm
            key={activeArtifactType}
            artifactType={activeArtifactType}
            isLoading={isLoading}
            onSubmit={onSendMessage}
          />
        ) : null}
        {isFollowUpMode ? (
          <p className="mb-3 text-xs leading-5 text-stone-500">
            Freeform chat is grounded in the active artifact and its latest revision.
          </p>
        ) : null}
        <div className="mb-4 rounded-3xl border border-stone-200 bg-[#fcfaf6] px-4 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Starter prompts for {activeArtifactLabel}
          </div>
          <p className="mt-2 text-xs leading-5 text-stone-600">
            Use one to seed the freeform composer without sending immediately.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {starterPrompts.map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => setDraft(starter)}
                disabled={isLoading}
                className="rounded-full border border-stone-200 bg-white px-3 py-2 text-left text-sm leading-5 text-stone-700 transition hover:border-stone-300 hover:text-stone-900 disabled:cursor-not-allowed disabled:text-stone-400"
              >
                {starter}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onRemind}
            className="text-sm font-medium text-stone-500 underline decoration-stone-300 underline-offset-4 transition hover:text-stone-800"
          >
            Remind me what we were working on
          </button>
          <button
            type="button"
            onClick={onBrainstorm}
            disabled={isLoading}
            className="text-sm font-medium text-stone-500 underline decoration-stone-300 underline-offset-4 transition hover:text-stone-800 disabled:cursor-not-allowed disabled:text-stone-400"
          >
            🔎 Brainstorm pain points
          </button>
          {onResearch ? (
            <button
              type="button"
              onClick={onResearch}
              disabled={isLoading}
              className="text-sm font-medium text-stone-500 underline decoration-stone-300 underline-offset-4 transition hover:text-stone-800 disabled:cursor-not-allowed disabled:text-stone-400"
            >
              📄 Update customer research memo
            </button>
          ) : null}
          {onUltraplan ? (
            <button
              type="button"
              onClick={onUltraplan}
              disabled={isLoading}
              className="text-sm font-medium text-stone-500 underline decoration-stone-300 underline-offset-4 transition hover:text-stone-800 disabled:cursor-not-allowed disabled:text-stone-400"
            >
              ⚡ Ultraplan
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="flex items-end gap-3" aria-label="Freeform chat">
          <div className="flex-1">
            <label htmlFor="freeform-chat-input" className="mb-2 block text-sm font-medium text-stone-700">
              Freeform chat
            </label>
            <textarea
              id="freeform-chat-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={placeholder}
              disabled={isLoading}
              className="min-h-24 w-full resize-none rounded-3xl border border-stone-200 bg-[#fcfaf6] px-4 py-3 text-sm text-stone-800 outline-none transition focus:border-stone-400"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || isDraftEmpty}
            className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
          >
            {sendLabel}
          </button>
        </form>
      </div>

      <div className="border-t border-stone-200 bg-[#fcfaf6] px-4 py-4">
        <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
          Current phase: {activePhase?.title}
        </div>
        <PhaseTracker
          phases={phases}
          activePhaseId={activePhaseId}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((current) => !current)}
          onSetActivePhase={onSetActivePhase}
          onToggleTask={onToggleTask}
        />
      </div>
    </div>
  );
}
