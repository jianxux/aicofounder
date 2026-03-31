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

export type Project = {
  id: string;
  name: string;
  description: string;
  phase: string;
  updatedAt: string;
  notes: StickyNoteData[];
  sections: SectionData[];
  documents: DocumentCardData[];
  messages: ChatMessage[];
  phases: Phase[];
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
    value.messages.every(isChatMessage) &&
    value.phases.every(isPhase)
  );
};
