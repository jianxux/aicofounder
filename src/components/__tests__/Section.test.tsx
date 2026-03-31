import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import Section from "@/components/Section";
import type { SectionData } from "@/lib/types";

const createSection = (overrides: Partial<SectionData> = {}): SectionData => ({
  id: "section-1",
  title: "Research Cluster",
  color: "yellow",
  x: 120,
  y: 160,
  width: 320,
  height: 220,
  ...overrides,
});

describe("Section", () => {
  it("renders with the correct title text", () => {
    render(
      <Section
        section={createSection()}
        zoom={1}
        onChange={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Research Cluster" })).toBeInTheDocument();
  });

  it.each([
    ["yellow", "border-amber-300", "bg-amber-100/60", "text-amber-900"],
    ["blue", "border-sky-300", "bg-sky-100/60", "text-sky-900"],
    ["green", "border-emerald-300", "bg-emerald-100/60", "text-emerald-900"],
    ["pink", "border-pink-300", "bg-pink-100/60", "text-pink-900"],
    ["purple", "border-violet-300", "bg-violet-100/60", "text-violet-900"],
  ] as const)(
    "renders %s section color classes",
    (color, borderClass, backgroundClass, textClass) => {
      const { container } = render(
        <Section
          section={createSection({ color })}
          zoom={1}
          onChange={vi.fn()}
          onDragStart={vi.fn()}
        />,
      );

      const sectionElement = container.firstChild;
      const titleBar = screen.getByRole("button", { name: "Research Cluster" }).parentElement;

      expect(sectionElement).toHaveClass(borderClass, backgroundClass);
      expect(titleBar).toHaveClass(textClass);
    },
  );

  it("applies the correct positioning styles based on x, y, width, height, and zoom", () => {
    const { container } = render(
      <Section
        section={createSection({ x: 40, y: 80, width: 200, height: 140 })}
        zoom={1.5}
        onChange={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    expect(container.firstChild).toHaveStyle({
      left: "60px",
      top: "120px",
      width: "300px",
      height: "210px",
    });
  });

  it("edits the title on blur and calls onChange with the new value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <Section
        section={createSection()}
        zoom={1}
        onChange={onChange}
        onDragStart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Research Cluster" }));

    const input = screen.getByDisplayValue("Research Cluster");

    await user.clear(input);
    await user.type(input, "Updated Research Cluster");
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("section-1", {
      title: "Updated Research Cluster",
    });
  });

  it("commits the title edit when Enter is pressed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <Section
        section={createSection()}
        zoom={1}
        onChange={onChange}
        onDragStart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Research Cluster" }));

    const input = screen.getByDisplayValue("Research Cluster");

    await user.clear(input);
    await user.type(input, "Final Title{Enter}");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("section-1", { title: "Final Title" });
    expect(screen.queryByDisplayValue("Final Title")).not.toBeInTheDocument();
  });

  it("reverts the title edit when Escape is pressed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <Section
        section={createSection()}
        zoom={1}
        onChange={onChange}
        onDragStart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Research Cluster" }));

    const input = screen.getByDisplayValue("Research Cluster");

    await user.clear(input);
    await user.type(input, "Discarded Title");
    await user.keyboard("{Escape}");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Research Cluster" })).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Discarded Title")).not.toBeInTheDocument();
  });

  it("defaults empty title edits to Untitled section", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <Section
        section={createSection()}
        zoom={1}
        onChange={onChange}
        onDragStart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Research Cluster" }));

    const input = screen.getByDisplayValue("Research Cluster");

    await user.clear(input);
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith("section-1", { title: "Untitled section" });
  });

  it("calls onDragStart when the title bar is pressed", () => {
    const onDragStart = vi.fn();

    render(
      <Section
        section={createSection()}
        zoom={1}
        onChange={vi.fn()}
        onDragStart={onDragStart}
      />,
    );

    const titleBar = screen.getByRole("button", { name: "Research Cluster" }).parentElement;

    expect(titleBar).not.toBeNull();

    fireEvent.mouseDown(titleBar!);

    expect(onDragStart).toHaveBeenCalledTimes(1);
    expect(onDragStart.mock.calls[0]?.[0]).toBe("section-1");
    expect(onDragStart.mock.calls[0]?.[1].type).toBe("mousedown");
  });

  it("stops propagation on the edit button mouseDown", () => {
    const onDragStart = vi.fn();

    render(
      <Section
        section={createSection()}
        zoom={1}
        onChange={vi.fn()}
        onDragStart={onDragStart}
      />,
    );

    fireEvent.mouseDown(screen.getByRole("button", { name: "Research Cluster" }));

    expect(onDragStart).not.toHaveBeenCalled();
  });

  it("renders a delete button when onDelete is provided", () => {
    render(
      <Section
        section={createSection()}
        zoom={1}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Delete section" })).toBeInTheDocument();
  });

  it("calls onDelete with the section id when the delete button is clicked", () => {
    const onDelete = vi.fn();

    render(
      <Section
        section={createSection()}
        zoom={1}
        onChange={vi.fn()}
        onDelete={onDelete}
        onDragStart={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete section" }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith("section-1");
  });

  it("stops propagation on the delete button mouseDown", () => {
    const onDragStart = vi.fn();

    render(
      <Section
        section={createSection()}
        zoom={1}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={onDragStart}
      />,
    );

    fireEvent.mouseDown(screen.getByRole("button", { name: "Delete section" }));

    expect(onDragStart).not.toHaveBeenCalled();
  });

  it("falls back to yellow classes for an unknown color", () => {
    const invalidSection = { ...createSection(), color: "orange" } as unknown as SectionData;
    const { container } = render(
      <Section
        section={invalidSection}
        zoom={1}
        onChange={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    const sectionElement = container.firstChild;
    const titleBar = screen.getByRole("button", { name: "Research Cluster" }).parentElement;

    expect(sectionElement).toHaveClass("border-amber-300", "bg-amber-100/60");
    expect(titleBar).toHaveClass("text-amber-900");
  });
});
