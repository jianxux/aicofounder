"use client";

import { FormEvent, useMemo, useState } from "react";
import PhaseTracker from "@/components/PhaseTracker";
import { ChatMessage, Phase } from "@/lib/types";

type ChatPanelProps = {
  messages: ChatMessage[];
  phases: Phase[];
  activePhaseId: string;
  activeArtifactLabel: string;
  activeArtifactType: "validation-scorecard" | "customer-research-memo";
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

  const activePhase = useMemo(
    () => phases.find((phase) => phase.id === activePhaseId) ?? phases[0],
    [activePhaseId, phases],
  );
  const isResearchMemoActive = activeArtifactType === "customer-research-memo";
  const headerTitle = isResearchMemoActive ? "Update the customer research memo" : "Build the validation scorecard";
  const headerCopy = isResearchMemoActive
    ? "Use chat to refine findings, pressure-test assumptions, and capture the latest customer evidence in this memo."
    : "Use chat to define evidence, scores, and open questions so the validation scorecard stays decision-ready.";
  const placeholder = isResearchMemoActive
    ? "Add findings, contradictions, or next questions for the customer research memo..."
    : "Add evidence, scores, or next validation checks for the scorecard...";
  const sendLabel = isResearchMemoActive ? "Update memo" : "Update scorecard";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.trim()) {
      return;
    }

    onSendMessage(draft.trim());
    setDraft("");
  };

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
        </div>
        <h2 className="mt-3 text-2xl font-semibold text-stone-900">{headerTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          {headerCopy}
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {messages.map((message) => {
          const isUser = message.sender === "user";

          return (
            <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${
                  isUser ? "bg-sky-600 text-white" : "bg-stone-100 text-stone-800"
                }`}
              >
                {message.content}
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
          <button
            type="button"
            onClick={onResearch}
            disabled={isLoading}
            className="text-sm font-medium text-stone-500 underline decoration-stone-300 underline-offset-4 transition hover:text-stone-800 disabled:cursor-not-allowed disabled:text-stone-400"
          >
            📄 Update customer research memo
          </button>
          <button
            type="button"
            onClick={onUltraplan}
            disabled={isLoading}
            className="text-sm font-medium text-stone-500 underline decoration-stone-300 underline-offset-4 transition hover:text-stone-800 disabled:cursor-not-allowed disabled:text-stone-400"
          >
            ⚡ Ultraplan
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            className="min-h-24 flex-1 resize-none rounded-3xl border border-stone-200 bg-[#fcfaf6] px-4 py-3 text-sm text-stone-800 outline-none transition focus:border-stone-400"
          />
          <button
            type="submit"
            disabled={isLoading}
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
