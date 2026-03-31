import * as types from "@/lib/types";

describe("lib/types guards", () => {
  const nonRecordValues: unknown[] = [null, undefined, 123, "hello"];

  const chatMessage: types.ChatMessage = {
    id: "message-1",
    sender: "user",
    content: "Hello",
    createdAt: "2025-01-01T00:00:00.000Z",
  };

  const stickyNote: types.StickyNoteData = {
    id: "note-1",
    title: "Idea",
    content: "Build the MVP",
    color: "yellow",
    x: 120,
    y: 240,
  };

  const documentCard: types.DocumentCardData = {
    id: "doc-1",
    title: "My Document",
    content: "# Hello\n\nSome **bold** text",
    x: 100,
    y: 200,
  };

  const phaseTask: types.PhaseTask = {
    id: "task-1",
    label: "Define scope",
    done: false,
  };

  const phase: types.Phase = {
    id: "phase-1",
    title: "Discovery",
    tasks: [phaseTask],
  };

  const project: types.Project = {
    id: "project-1",
    name: "AI Cofounder",
    description: "Product planning workspace",
    phase: phase.id,
    updatedAt: "2025-01-01T00:00:00.000Z",
    notes: [stickyNote],
    documents: [documentCard],
    messages: [chatMessage],
    phases: [phase],
  };

  it("accepts a valid ChatMessage", () => {
    expect(types.isChatMessage(chatMessage)).toBe(true);
    expect(types.isSender(chatMessage.sender)).toBe(true);
  });

  it("accepts a valid StickyNoteData object", () => {
    expect(types.isStickyNoteData(stickyNote)).toBe(true);
    expect(types.isNoteColor(stickyNote.color)).toBe(true);
  });

  it("accepts a valid DocumentCardData object", () => {
    expect(types.isDocumentCardData(documentCard)).toBe(true);
  });

  it.each(["yellow", "blue", "green", "pink", "purple"] as const)(
    "accepts %s as a valid note color",
    (color) => {
      expect(types.isNoteColor(color)).toBe(true);
      expect(types.isStickyNoteData({ ...stickyNote, color })).toBe(true);
    },
  );

  it("accepts a valid PhaseTask and Phase", () => {
    expect(types.isPhaseTask(phaseTask)).toBe(true);
    expect(types.isPhase(phase)).toBe(true);
  });

  it("accepts a valid Project with nested data", () => {
    expect(types.isProject(project)).toBe(true);
  });

  it("rejects invalid validation patterns", () => {
    expect(types.isChatMessage({ ...chatMessage, sender: "system" })).toBe(false);
    expect(types.isStickyNoteData({ ...stickyNote, x: "120" })).toBe(false);
    expect(types.isDocumentCardData({ ...documentCard, y: "200" })).toBe(false);
    expect(types.isPhaseTask({ ...phaseTask, done: "no" })).toBe(false);
    expect(types.isPhase({ ...phase, tasks: [{ ...phaseTask, done: "no" }] })).toBe(false);
    expect(types.isProject({ ...project, notes: [{ ...stickyNote, color: "blue" }] })).toBe(true);
  });

  it.each(["amber", "", null, undefined, 123, {}, []])(
    "rejects %o as an invalid note color",
    (value) => {
      expect(types.isNoteColor(value)).toBe(false);
    },
  );

  it("rejects non-record values in every object type guard", () => {
    nonRecordValues.forEach((value) => {
      expect(types.isChatMessage(value)).toBe(false);
      expect(types.isStickyNoteData(value)).toBe(false);
      expect(types.isDocumentCardData(value)).toBe(false);
      expect(types.isPhaseTask(value)).toBe(false);
      expect(types.isPhase(value)).toBe(false);
      expect(types.isProject(value)).toBe(false);
    });
  });

  it("rejects empty objects in each object type guard", () => {
    expect(types.isChatMessage({})).toBe(false);
    expect(types.isStickyNoteData({})).toBe(false);
    expect(types.isDocumentCardData({})).toBe(false);
    expect(types.isPhaseTask({})).toBe(false);
    expect(types.isPhase({})).toBe(false);
    expect(types.isProject({})).toBe(false);
  });

  it("rejects Phase when tasks is not an array", () => {
    expect(types.isPhase({ id: phase.id, title: phase.title, tasks: null })).toBe(false);
    expect(types.isPhase({ id: phase.id, title: phase.title, tasks: undefined })).toBe(false);
    expect(types.isPhase({ id: phase.id, title: phase.title, tasks: 123 })).toBe(false);
    expect(types.isPhase({ id: phase.id, title: phase.title, tasks: "tasks" })).toBe(false);
    expect(types.isPhase({ id: phase.id, title: phase.title, tasks: {} })).toBe(false);
  });

  it("rejects Project when notes, documents, messages, or phases are not arrays", () => {
    expect(types.isProject({ ...project, notes: null })).toBe(false);
    expect(types.isProject({ ...project, notes: undefined })).toBe(false);
    expect(types.isProject({ ...project, notes: 123 })).toBe(false);
    expect(types.isProject({ ...project, notes: "notes" })).toBe(false);
    expect(types.isProject({ ...project, notes: {} })).toBe(false);

    expect(types.isProject({ ...project, documents: null })).toBe(false);
    expect(types.isProject({ ...project, documents: undefined })).toBe(false);
    expect(types.isProject({ ...project, documents: 123 })).toBe(false);
    expect(types.isProject({ ...project, documents: "documents" })).toBe(false);
    expect(types.isProject({ ...project, documents: {} })).toBe(false);

    expect(types.isProject({ ...project, messages: null })).toBe(false);
    expect(types.isProject({ ...project, messages: undefined })).toBe(false);
    expect(types.isProject({ ...project, messages: 123 })).toBe(false);
    expect(types.isProject({ ...project, messages: "messages" })).toBe(false);
    expect(types.isProject({ ...project, messages: {} })).toBe(false);

    expect(types.isProject({ ...project, phases: null })).toBe(false);
    expect(types.isProject({ ...project, phases: undefined })).toBe(false);
    expect(types.isProject({ ...project, phases: 123 })).toBe(false);
    expect(types.isProject({ ...project, phases: "phases" })).toBe(false);
    expect(types.isProject({ ...project, phases: {} })).toBe(false);
  });

  it("accepts Project with empty notes, documents, messages, and phases arrays", () => {
    expect(
      types.isProject({
        ...project,
        notes: [],
        documents: [],
        messages: [],
        phases: [],
      }),
    ).toBe(true);
  });
});
