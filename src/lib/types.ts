export type Sender = "user" | "assistant";

export type ChatMessage = {
  id: string;
  sender: Sender;
  content: string;
  createdAt: string;
};

export type NoteColor = "yellow";

export type StickyNoteData = {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
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
  messages: ChatMessage[];
  phases: Phase[];
};
