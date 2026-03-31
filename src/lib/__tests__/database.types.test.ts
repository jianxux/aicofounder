import { describe, expect, it } from "vitest";
import * as dbTypes from "@/lib/database.types";

describe("lib/database.types guards", () => {
  const nonRecordValues: unknown[] = [null, undefined, 123, "hello", true, []];

  const project: dbTypes.DbProject = {
    id: "project-1",
    user_id: "user-1",
    name: "AI Cofounder",
    description: "Planning workspace",
    phase: "Getting started",
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
  };

  const message: dbTypes.DbMessage = {
    id: "message-1",
    project_id: "project-1",
    sender: "user",
    content: "Hello",
    created_at: "2025-01-01T00:00:00.000Z",
  };

  const canvasItem: dbTypes.DbCanvasItem = {
    id: "canvas-1",
    project_id: "project-1",
    type: "note",
    data: { title: "Idea" },
    x: 10,
    y: 20,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
  };

  const phase: dbTypes.DbPhase = {
    id: "discovery",
    project_id: "project-1",
    title: "Discovery",
    sort_order: 1,
  };

  const phaseTask: dbTypes.DbPhaseTask = {
    id: "task-1",
    phase_id: "discovery",
    project_id: "project-1",
    label: "Define scope",
    done: false,
    sort_order: 1,
  };

  it("accepts valid objects", () => {
    expect(dbTypes.isDbProject(project)).toBe(true);
    expect(dbTypes.isDbMessage(message)).toBe(true);
    expect(dbTypes.isDbCanvasItem(canvasItem)).toBe(true);
    expect(dbTypes.isDbPhase(phase)).toBe(true);
    expect(dbTypes.isDbPhaseTask(phaseTask)).toBe(true);
  });

  it("accepts valid objects with extra fields", () => {
    expect(dbTypes.isDbProject({ ...project, extra: true })).toBe(true);
    expect(dbTypes.isDbMessage({ ...message, extra: true })).toBe(true);
    expect(dbTypes.isDbCanvasItem({ ...canvasItem, extra: true })).toBe(true);
    expect(dbTypes.isDbPhase({ ...phase, extra: true })).toBe(true);
    expect(dbTypes.isDbPhaseTask({ ...phaseTask, extra: true })).toBe(true);
  });

  it("rejects non-record values in every guard", () => {
    nonRecordValues.forEach((value) => {
      expect(dbTypes.isDbProject(value)).toBe(false);
      expect(dbTypes.isDbMessage(value)).toBe(false);
      expect(dbTypes.isDbCanvasItem(value)).toBe(false);
      expect(dbTypes.isDbPhase(value)).toBe(false);
      expect(dbTypes.isDbPhaseTask(value)).toBe(false);
    });
  });

  it("rejects empty objects in every guard", () => {
    expect(dbTypes.isDbProject({})).toBe(false);
    expect(dbTypes.isDbMessage({})).toBe(false);
    expect(dbTypes.isDbCanvasItem({})).toBe(false);
    expect(dbTypes.isDbPhase({})).toBe(false);
    expect(dbTypes.isDbPhaseTask({})).toBe(false);
  });

  it("rejects DbProject with missing fields, wrong types, and nulls", () => {
    expect(dbTypes.isDbProject({ ...project, id: undefined })).toBe(false);
    expect(dbTypes.isDbProject({ ...project, user_id: 1 })).toBe(false);
    expect(dbTypes.isDbProject({ ...project, name: null })).toBe(false);
    expect(dbTypes.isDbProject({ ...project, description: 2 })).toBe(false);
    expect(dbTypes.isDbProject({ ...project, phase: false })).toBe(false);
    expect(dbTypes.isDbProject({ ...project, created_at: 3 })).toBe(false);
    expect(dbTypes.isDbProject({ ...project, updated_at: null })).toBe(false);
  });

  it("rejects DbMessage with missing fields, wrong types, and nulls", () => {
    expect(dbTypes.isDbMessage({ ...message, id: undefined })).toBe(false);
    expect(dbTypes.isDbMessage({ ...message, project_id: 1 })).toBe(false);
    expect(dbTypes.isDbMessage({ ...message, sender: "system" })).toBe(false);
    expect(dbTypes.isDbMessage({ ...message, sender: null })).toBe(false);
    expect(dbTypes.isDbMessage({ ...message, content: 2 })).toBe(false);
    expect(dbTypes.isDbMessage({ ...message, created_at: null })).toBe(false);
  });

  it("rejects DbCanvasItem with missing fields, wrong types, and nulls", () => {
    expect(dbTypes.isDbCanvasItem({ ...canvasItem, id: undefined })).toBe(false);
    expect(dbTypes.isDbCanvasItem({ ...canvasItem, project_id: 1 })).toBe(false);
    expect(dbTypes.isDbCanvasItem({ ...canvasItem, type: "board" })).toBe(false);
    expect(dbTypes.isDbCanvasItem({ ...canvasItem, data: null })).toBe(false);
    expect(dbTypes.isDbCanvasItem({ ...canvasItem, data: [] })).toBe(false);
    expect(dbTypes.isDbCanvasItem({ ...canvasItem, x: "10" })).toBe(false);
    expect(dbTypes.isDbCanvasItem({ ...canvasItem, y: null })).toBe(false);
    expect(dbTypes.isDbCanvasItem({ ...canvasItem, created_at: 3 })).toBe(false);
    expect(dbTypes.isDbCanvasItem({ ...canvasItem, updated_at: false })).toBe(false);
  });

  it("accepts every supported canvas item type", () => {
    const validTypes: dbTypes.CanvasItemType[] = [
      "note",
      "section",
      "document",
      "website_builder",
    ];

    validTypes.forEach((type) => {
      expect(dbTypes.isDbCanvasItem({ ...canvasItem, type })).toBe(true);
    });
  });

  it("rejects DbPhase with missing fields, wrong types, and nulls", () => {
    expect(dbTypes.isDbPhase({ ...phase, id: undefined })).toBe(false);
    expect(dbTypes.isDbPhase({ ...phase, project_id: 1 })).toBe(false);
    expect(dbTypes.isDbPhase({ ...phase, title: null })).toBe(false);
    expect(dbTypes.isDbPhase({ ...phase, sort_order: "1" })).toBe(false);
  });

  it("rejects DbPhaseTask with missing fields, wrong types, and nulls", () => {
    expect(dbTypes.isDbPhaseTask({ ...phaseTask, id: undefined })).toBe(false);
    expect(dbTypes.isDbPhaseTask({ ...phaseTask, phase_id: 1 })).toBe(false);
    expect(dbTypes.isDbPhaseTask({ ...phaseTask, project_id: null })).toBe(false);
    expect(dbTypes.isDbPhaseTask({ ...phaseTask, label: 2 })).toBe(false);
    expect(dbTypes.isDbPhaseTask({ ...phaseTask, done: "false" })).toBe(false);
    expect(dbTypes.isDbPhaseTask({ ...phaseTask, sort_order: null })).toBe(false);
  });
});
