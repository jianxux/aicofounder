import type { ResearchReport } from "@/lib/research";

export type Sender = "user" | "assistant";

export type ChatMessage = {
  id: string;
  sender: Sender;
  content: string;
  createdAt: string;
};

export type NoteColor = "yellow" | "blue" | "green" | "pink" | "purple";

export type StickyNoteData = {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  x: number;
  y: number;
};

export type SectionData = {
  id: string;
  title: string;
  color: NoteColor;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DocumentCardData = {
  id: string;
  title: string;
  content: string;
  x: number;
  y: number;
};

export type WebsiteBlockType = "hero" | "features" | "cta" | "text";

export type WebsiteBlock = {
  id: string;
  type: WebsiteBlockType;
  heading: string;
  body: string;
  buttonText?: string;
};

export type WebsiteBuilderData = {
  id: string;
  title: string;
  blocks: WebsiteBlock[];
  x: number;
  y: number;
};

export type PhaseTask = {
  id: string;
  label: string;
  done: boolean;
};

export type Phase = {
  id: string;
  title: string;
  tasks: PhaseTask[];
};

export type ProjectResearch = {
  status: "success" | "error";
  report?: ResearchReport;
  errorMessage?: string;
  researchQuestion: string;
  sourceContext: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  phase: string;
  updatedAt: string;
  notes: StickyNoteData[];
  sections?: SectionData[];
  documents: DocumentCardData[];
  websiteBuilders?: WebsiteBuilderData[];
  messages: ChatMessage[];
  phases: Phase[];
  research?: ProjectResearch | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isSender = (value: unknown): value is Sender =>
  value === "user" || value === "assistant";

export const isChatMessage = (value: unknown): value is ChatMessage => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    isSender(value.sender) &&
    typeof value.content === "string" &&
    typeof value.createdAt === "string"
  );
};

export const isNoteColor = (value: unknown): value is NoteColor =>
  value === "yellow" ||
  value === "blue" ||
  value === "green" ||
  value === "pink" ||
  value === "purple";

export const isStickyNoteData = (value: unknown): value is StickyNoteData => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.content === "string" &&
    isNoteColor(value.color) &&
    typeof value.x === "number" &&
    typeof value.y === "number"
  );
};

export const isSectionData = (value: unknown): value is SectionData => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    isNoteColor(value.color) &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    typeof value.width === "number" &&
    typeof value.height === "number"
  );
};

export const isDocumentCardData = (value: unknown): value is DocumentCardData => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.content === "string" &&
    typeof value.x === "number" &&
    typeof value.y === "number"
  );
};

export const isWebsiteBlockType = (value: unknown): value is WebsiteBlockType =>
  value === "hero" || value === "features" || value === "cta" || value === "text";

export const isWebsiteBlock = (value: unknown): value is WebsiteBlock => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    isWebsiteBlockType(value.type) &&
    typeof value.heading === "string" &&
    typeof value.body === "string" &&
    (value.buttonText === undefined || typeof value.buttonText === "string")
  );
};

export const isWebsiteBuilderData = (value: unknown): value is WebsiteBuilderData => {
  if (!isRecord(value) || !Array.isArray(value.blocks)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    value.blocks.every(isWebsiteBlock) &&
    typeof value.x === "number" &&
    typeof value.y === "number"
  );
};

export const isPhaseTask = (value: unknown): value is PhaseTask => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    typeof value.done === "boolean"
  );
};

export const isPhase = (value: unknown): value is Phase => {
  if (!isRecord(value) || !Array.isArray(value.tasks)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    value.tasks.every(isPhaseTask)
  );
};

const isResearchRelevance = (value: unknown): value is "high" | "medium" | "low" =>
  value === "high" || value === "medium" || value === "low";

const isResearchCitation = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.source === "string" &&
    typeof value.claim === "string" &&
    isResearchRelevance(value.relevance) &&
    (value.url === undefined || typeof value.url === "string")
  );
};

const isResearchSection = (value: unknown): boolean => {
  if (!isRecord(value) || !Array.isArray(value.citations)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.angle === "string" &&
    typeof value.findings === "string" &&
    value.citations.every(isResearchCitation)
  );
};

export const isProjectResearch = (value: unknown): value is ProjectResearch => {
  if (!isRecord(value)) {
    return false;
  }

  if (value.status !== "success" && value.status !== "error") {
    return false;
  }

  return (
    typeof value.researchQuestion === "string" &&
    typeof value.sourceContext === "string" &&
    typeof value.updatedAt === "string" &&
    (value.errorMessage === undefined || typeof value.errorMessage === "string") &&
    (value.report === undefined ||
      (isRecord(value.report) &&
        Array.isArray(value.report.sections) &&
        value.report.sections.every(isResearchSection) &&
        typeof value.report.executiveSummary === "string" &&
        typeof value.report.researchQuestion === "string" &&
        typeof value.report.generatedAt === "string"))
  );
};

export const isProject = (value: unknown): value is Project => {
  if (
    !isRecord(value) ||
    !Array.isArray(value.notes) ||
    !Array.isArray(value.documents) ||
    !Array.isArray(value.messages) ||
    !Array.isArray(value.phases)
  ) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    typeof value.phase === "string" &&
    typeof value.updatedAt === "string" &&
    value.notes.every(isStickyNoteData) &&
    (value.sections == null || (Array.isArray(value.sections) && value.sections.every(isSectionData))) &&
    value.documents.every(isDocumentCardData) &&
    (value.websiteBuilders == null ||
      (Array.isArray(value.websiteBuilders) && value.websiteBuilders.every(isWebsiteBuilderData))) &&
    value.messages.every(isChatMessage) &&
    value.phases.every(isPhase) &&
    (value.research == null || isProjectResearch(value.research))
  );
};
