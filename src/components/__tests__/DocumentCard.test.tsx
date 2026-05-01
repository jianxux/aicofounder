import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DocumentCard from "@/components/DocumentCard";
import type { DocumentCardData } from "@/lib/types";

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown-content">{children}</div>,
}));

const createDocument = (overrides: Partial<DocumentCardData> = {}): DocumentCardData => ({
  id: "doc-1",
  title: "My Document",
  content: "# Hello\n\nSome **bold** text",
  x: 100,
  y: 200,
  ...overrides,
});

describe("DocumentCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the document title in an input", () => {
    render(
      <DocumentCard document={createDocument()} zoom={1} onChange={vi.fn()} onDragStart={vi.fn()} />,
    );

    expect(screen.getByRole("textbox", { name: /document title/i })).toHaveValue("My Document");
  });

  it("renders markdown content when not editing", () => {
    render(
      <DocumentCard document={createDocument()} zoom={1} onChange={vi.fn()} onDragStart={vi.fn()} />,
    );

    expect(screen.getByTestId("markdown-content")).toHaveTextContent("Hello");
  });

  it("enters edit mode on double click and shows textarea", () => {
    render(<DocumentCard document={createDocument()} zoom={1} onChange={vi.fn()} onDragStart={vi.fn()} />);

    fireEvent.doubleClick(screen.getByTestId("markdown-content").parentElement as HTMLDivElement);

    const textarea = screen.getByRole("textbox", { name: /document content/i });

    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue("# Hello\n\nSome **bold** text");
  });

  it("exits edit mode on blur", () => {
    render(<DocumentCard document={createDocument()} zoom={1} onChange={vi.fn()} onDragStart={vi.fn()} />);

    fireEvent.doubleClick(screen.getByTestId("markdown-content").parentElement as HTMLDivElement);

    const textarea = screen.getByRole("textbox", { name: /document content/i });

    expect(textarea).toBeInTheDocument();
    fireEvent.blur(textarea);

    expect(screen.getByTestId("markdown-content")).toHaveTextContent("Hello");
  });

  it("calls onChange when title is edited", () => {
    const onChange = vi.fn();

    render(<DocumentCard document={createDocument()} zoom={1} onChange={onChange} onDragStart={vi.fn()} />);

    fireEvent.change(screen.getByRole("textbox", { name: /document title/i }), {
      target: { value: "Updated Title" },
    });

    expect(onChange).toHaveBeenCalledWith("doc-1", { title: "Updated Title" });
  });

  it("calls onChange when content is edited in edit mode", () => {
    const onChange = vi.fn();

    render(<DocumentCard document={createDocument()} zoom={1} onChange={onChange} onDragStart={vi.fn()} />);

    fireEvent.doubleClick(screen.getByTestId("markdown-content").parentElement as HTMLDivElement);

    const textarea = screen.getByRole("textbox", { name: /document content/i });

    expect(textarea).toBeInTheDocument();
    fireEvent.change(textarea, {
      target: { value: "# Updated\n\nNew content" },
    });

    expect(onChange).toHaveBeenCalledWith("doc-1", { content: "# Updated\n\nNew content" });
  });

  it("calls onDragStart when header is pointerdown", () => {
    const onDragStart = vi.fn();

    render(
      <DocumentCard document={createDocument()} zoom={1} onChange={vi.fn()} onDragStart={onDragStart} />,
    );

    fireEvent.pointerDown(
      screen.getByRole("textbox", { name: /document title/i }).parentElement as HTMLDivElement,
    );

    expect(onDragStart).toHaveBeenCalledTimes(1);
    expect(onDragStart.mock.calls[0]?.[0]).toBe("doc-1");
  });

  it("renders a delete button when onDelete is provided", () => {
    render(
      <DocumentCard
        document={createDocument()}
        zoom={1}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Delete document" })).toBeInTheDocument();
  });

  it("calls onDelete with the document id when the delete button is clicked", () => {
    const onDelete = vi.fn();

    render(
      <DocumentCard
        document={createDocument()}
        zoom={1}
        onChange={vi.fn()}
        onDelete={onDelete}
        onDragStart={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete document" }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith("doc-1");
  });

  it("stops propagation from the delete button pointerDown", () => {
    const onDragStart = vi.fn();

    render(
      <DocumentCard
        document={createDocument()}
        zoom={1}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={onDragStart}
      />,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "Delete document" }));

    expect(onDragStart).not.toHaveBeenCalled();
  });

  it("applies zoom transform and position styles", () => {
    const { container } = render(
      <DocumentCard document={createDocument()} zoom={1.2} onChange={vi.fn()} onDragStart={vi.fn()} />,
    );

    const card = container.firstChild as HTMLDivElement;

    expect(card).toHaveStyle({
      left: "100px",
      top: "200px",
    });
  });

  it("renders with correct dimensions (w-80)", () => {
    const { container } = render(
      <DocumentCard document={createDocument()} zoom={1} onChange={vi.fn()} onDragStart={vi.fn()} />,
    );

    expect(container.firstChild).toHaveClass("w-80");
  });
});
