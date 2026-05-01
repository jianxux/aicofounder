import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import WebsiteBuilder from "@/components/WebsiteBuilder";
import type { WebsiteBlock, WebsiteBuilderData } from "@/lib/types";

const createBlock = (overrides: Partial<WebsiteBlock> = {}): WebsiteBlock => ({
  id: "block-1",
  type: "hero",
  heading: "Build trust fast",
  body: "Show customers what you do and why it matters.",
  buttonText: "Get started",
  ...overrides,
});

const createWebsiteBuilder = (
  overrides: Partial<WebsiteBuilderData> = {},
): WebsiteBuilderData => ({
  id: "website-1",
  title: "Acme AI",
  blocks: [
    createBlock({
      id: "hero-1",
      type: "hero",
      heading: "Turn visitors into signups",
      body: "Position the product clearly and keep the next step obvious.",
      buttonText: "Start free",
    }),
    createBlock({
      id: "features-1",
      type: "features",
      heading: "Why it works",
      body: "Fast setup\nClear workflow\nActionable outputs",
      buttonText: undefined,
    }),
    createBlock({
      id: "cta-1",
      type: "cta",
      heading: "Ready to ship faster?",
      body: "Join the waitlist and get early access.",
      buttonText: "Join waitlist",
    }),
    createBlock({
      id: "text-1",
      type: "text",
      heading: "Built for lean teams",
      body: "Use this section to add supporting proof and context.",
      buttonText: undefined,
    }),
  ],
  x: 180,
  y: 220,
  ...overrides,
});

describe("WebsiteBuilder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders in edit mode by default with the title input and block fields", () => {
    render(
      <WebsiteBuilder
        websiteBuilder={createWebsiteBuilder()}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue("Acme AI")).toBeInTheDocument();
    expect(screen.getByText("1. hero")).toBeInTheDocument();
    expect(screen.getByText("2. features")).toBeInTheDocument();
    expect(screen.getByText("3. cta")).toBeInTheDocument();
    expect(screen.getByText("4. text")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Turn visitors into signups")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Position the product clearly and keep the next step obvious.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Start free")).toBeInTheDocument();
  });

  it("shows heading, body, and button text inputs for each block", () => {
    render(
      <WebsiteBuilder
        websiteBuilder={createWebsiteBuilder()}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    expect(screen.getAllByPlaceholderText("Heading")).toHaveLength(4);
    expect(screen.getAllByPlaceholderText("Body copy")).toHaveLength(4);
    expect(screen.getAllByPlaceholderText("Button text (optional)")).toHaveLength(4);
  });

  it("toggles to preview mode and renders hero, features, cta, and text sections", async () => {
    const user = userEvent.setup();

    render(
      <WebsiteBuilder
        websiteBuilder={createWebsiteBuilder()}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Preview" }));

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByText("Acme AI")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Turn visitors into signups" })).toBeInTheDocument();
    expect(screen.getByText("Fast setup")).toBeInTheDocument();
    expect(screen.getByText("Clear workflow")).toBeInTheDocument();
    expect(screen.getByText("Actionable outputs")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ready to ship faster?" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Built for lean teams" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Launch readiness checklist" })).toBeInTheDocument();
  });

  it("toggles back to edit mode from preview mode", async () => {
    const user = userEvent.setup();

    render(
      <WebsiteBuilder
        websiteBuilder={createWebsiteBuilder()}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Preview" }));
    await user.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByRole("button", { name: "Preview" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Turn visitors into signups")).toBeInTheDocument();
  });

  it("calls onChange when the website title is edited", () => {
    const onChange = vi.fn();

    render(
      <WebsiteBuilder
        websiteBuilder={createWebsiteBuilder()}
        onChange={onChange}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("Acme AI"), {
      target: { value: "Acme AI Studio" },
    });

    expect(onChange).toHaveBeenCalledWith("website-1", { title: "Acme AI Studio" });
  });

  it("calls onChange when a block heading is edited", () => {
    const onChange = vi.fn();

    render(
      <WebsiteBuilder
        websiteBuilder={createWebsiteBuilder()}
        onChange={onChange}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("Turn visitors into signups"), {
      target: { value: "Launch with clarity" },
    });

    expect(onChange).toHaveBeenCalledWith("website-1", {
      blocks: expect.arrayContaining([
        expect.objectContaining({ id: "hero-1", heading: "Launch with clarity" }),
      ]),
    });
  });

  it("calls onChange when a block body is edited", () => {
    const onChange = vi.fn();

    render(
      <WebsiteBuilder
        websiteBuilder={createWebsiteBuilder()}
        onChange={onChange}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    fireEvent.change(
      screen.getByDisplayValue("Position the product clearly and keep the next step obvious."),
      { target: { value: "Explain the value in one sentence." } },
    );

    expect(onChange).toHaveBeenCalledWith("website-1", {
      blocks: expect.arrayContaining([
        expect.objectContaining({ id: "hero-1", body: "Explain the value in one sentence." }),
      ]),
    });
  });

  it("calls onChange when a block button text is edited", () => {
    const onChange = vi.fn();

    render(
      <WebsiteBuilder
        websiteBuilder={createWebsiteBuilder()}
        onChange={onChange}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("Start free"), {
      target: { value: "Book demo" },
    });

    expect(onChange).toHaveBeenCalledWith("website-1", {
      blocks: expect.arrayContaining([
        expect.objectContaining({ id: "hero-1", buttonText: "Book demo" }),
      ]),
    });
  });

  it.each([
    ["Add Hero", "hero", "Turn your startup idea into a clear promise"],
    ["Add Features", "features", "Why customers care"],
    ["Add CTA", "cta", "Ready to validate demand?"],
    ["Add Text", "text", "Tell the story"],
  ] as const)("calls onChange to append a %s block", async (buttonName, type, heading) => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "new-block-id"),
    });

    render(
      <WebsiteBuilder
        websiteBuilder={createWebsiteBuilder({ blocks: [] })}
        onChange={onChange}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: buttonName }));

    expect(onChange).toHaveBeenCalledWith("website-1", {
      blocks: [expect.objectContaining({ id: "new-block-id", type, heading })],
    });

    vi.unstubAllGlobals();
  });

  it("calls onChange to remove a block", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const websiteBuilder = createWebsiteBuilder();

    render(
      <WebsiteBuilder
        websiteBuilder={websiteBuilder}
        onChange={onChange}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "Remove" })[0]!);

    expect(onChange).toHaveBeenCalledWith("website-1", {
      blocks: websiteBuilder.blocks.filter((block) => block.id !== "hero-1"),
    });
  });

  it("disables boundary block reorder controls in edit mode and does not render them in preview mode", async () => {
    const user = userEvent.setup();

    render(
      <WebsiteBuilder
        websiteBuilder={createWebsiteBuilder()}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Move hero block at position 1 up" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Move text block at position 4 down" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Move features block at position 2 up" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Move cta block at position 3 down" }),
    ).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Preview" }));

    expect(
      screen.queryByRole("button", { name: "Move hero block at position 1 up" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Move text block at position 4 down" }),
    ).not.toBeInTheDocument();
  });

  it("calls onChange with reordered blocks when moving blocks up and down", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const websiteBuilder = createWebsiteBuilder();

    render(
      <WebsiteBuilder
        websiteBuilder={websiteBuilder}
        onChange={onChange}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Move features block at position 2 up" }));
    expect(onChange).toHaveBeenCalledWith("website-1", {
      blocks: [
        websiteBuilder.blocks[1],
        websiteBuilder.blocks[0],
        websiteBuilder.blocks[2],
        websiteBuilder.blocks[3],
      ],
    });

    await user.click(screen.getByRole("button", { name: "Move cta block at position 3 down" }));
    expect(onChange).toHaveBeenCalledWith("website-1", {
      blocks: [
        websiteBuilder.blocks[0],
        websiteBuilder.blocks[1],
        websiteBuilder.blocks[3],
        websiteBuilder.blocks[2],
      ],
    });
  });

  it("calls onDelete when the delete button is clicked", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <WebsiteBuilder
        websiteBuilder={createWebsiteBuilder()}
        onChange={vi.fn()}
        onDelete={onDelete}
        onDragStart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete website builder" }));

    expect(onDelete).toHaveBeenCalledWith("website-1");
  });

  it("calls onDragStart when the header drag handle receives pointer down", () => {
    const onDragStart = vi.fn();

    render(
      <WebsiteBuilder
        websiteBuilder={createWebsiteBuilder()}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={onDragStart}
      />,
    );

    fireEvent.pointerDown(screen.getByText("Landing page canvas").parentElement?.parentElement as HTMLDivElement);

    expect(onDragStart).toHaveBeenCalledTimes(1);
    expect(onDragStart.mock.calls[0]?.[0]).toBe("website-1");
    expect(onDragStart.mock.calls[0]?.[1].type).toBe("pointerdown");
  });

  it("renders hero preview content including heading, body, and button text", async () => {
    const user = userEvent.setup();

    render(
      <WebsiteBuilder
        websiteBuilder={createWebsiteBuilder({ blocks: [createWebsiteBuilder().blocks[0]!] })}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Preview" }));

    expect(screen.getByRole("heading", { name: "Turn visitors into signups" })).toBeInTheDocument();
    expect(screen.getByText("Position the product clearly and keep the next step obvious.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start free" })).toBeInTheDocument();
  });

  it("renders features preview items split from newline-separated body text", async () => {
    const user = userEvent.setup();

    render(
      <WebsiteBuilder
        websiteBuilder={createWebsiteBuilder({
          blocks: [
            createBlock({
              id: "features-1",
              type: "features",
              heading: "Highlights",
              body: "One\n \nTwo\nThree",
              buttonText: undefined,
            }),
          ],
        })}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Preview" }));

    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
    expect(screen.getByText("Three")).toBeInTheDocument();
    expect(screen.queryByText(" ")).not.toBeInTheDocument();
  });

  it("renders cta preview with the dark background section styling", async () => {
    const user = userEvent.setup();

    render(
      <WebsiteBuilder
        websiteBuilder={createWebsiteBuilder({ blocks: [createWebsiteBuilder().blocks[2]!] })}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Preview" }));

    const ctaHeading = screen.getByRole("heading", { name: "Ready to ship faster?" });
    const ctaSection = ctaHeading.parentElement;

    expect(ctaSection).toHaveClass("bg-stone-900", "text-stone-50");
    expect(screen.getByRole("button", { name: "Join waitlist" })).toBeInTheDocument();
  });

  it("renders text preview with heading and paragraph", async () => {
    const user = userEvent.setup();

    render(
      <WebsiteBuilder
        websiteBuilder={createWebsiteBuilder({ blocks: [createWebsiteBuilder().blocks[3]!] })}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Preview" }));

    expect(screen.getByRole("heading", { name: "Built for lean teams" })).toBeInTheDocument();
    expect(screen.getByText("Use this section to add supporting proof and context.")).toBeInTheDocument();
  });

  it("renders without errors when blocks is empty", async () => {
    const user = userEvent.setup();

    render(
      <WebsiteBuilder
        websiteBuilder={createWebsiteBuilder({ blocks: [] })}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue("Acme AI")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Preview" }));

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("does not render a preview button when buttonText is missing", async () => {
    const user = userEvent.setup();

    render(
      <WebsiteBuilder
        websiteBuilder={createWebsiteBuilder({
          blocks: [
            createBlock({
              id: "hero-1",
              type: "hero",
              heading: "Simple hero",
              body: "No call to action yet.",
              buttonText: undefined,
            }),
          ],
        })}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Preview" }));

    expect(screen.getByRole("heading", { name: "Simple hero" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Get started" })).not.toBeInTheDocument();
  });

  it("renders launch readiness checklist as an accessible region with exactly three items in preview mode and preserves their order", async () => {
    const user = userEvent.setup();

    render(
      <WebsiteBuilder
        websiteBuilder={createWebsiteBuilder()}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Preview" }));

    const checklistRegion = screen.getByRole("region", { name: "Launch readiness checklist" });
    const checklistItems = within(checklistRegion).getAllByRole("listitem");

    expect(checklistItems).toHaveLength(3);
    expect(checklistItems[0]).toHaveTextContent("Clear one-sentence promise");
    expect(checklistItems[1]).toHaveTextContent("Primary conversion path");
    expect(checklistItems[2]).toHaveTextContent("Search/discovery basics");
  });

  it("does not render launch readiness checklist in edit mode", () => {
    render(
      <WebsiteBuilder
        websiteBuilder={createWebsiteBuilder()}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    expect(screen.queryByRole("region", { name: "Launch readiness checklist" })).not.toBeInTheDocument();
  });
});
