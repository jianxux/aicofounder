import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ArtifactRefinementForm from "@/components/ArtifactRefinementForm";

describe("ArtifactRefinementForm", () => {
  it("renders feedback source or quote field for customer research memo mode", () => {
    render(
      <ArtifactRefinementForm
        artifactType="customer-research-memo"
        isLoading={false}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Feedback source or quote")).toBeInTheDocument();
  });

  it("submitting only feedback source or quote trims whitespace, sends expected message, and clears the field", () => {
    const onSubmit = vi.fn();

    render(
      <ArtifactRefinementForm
        artifactType="customer-research-memo"
        isLoading={false}
        onSubmit={onSubmit}
      />,
    );

    const feedbackField = screen.getByLabelText("Feedback source or quote");
    const submitButton = screen.getByRole("button", { name: "Submit structured refinement" });

    expect(submitButton).toBeDisabled();
    fireEvent.change(feedbackField, {
      target: { value: "  \"users keep saying setup is confusing\" - interview #4  " },
    });
    expect(submitButton).toBeEnabled();

    fireEvent.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith(
      "Refine the customer research memo with this update:\nFeedback source or quote: \"users keep saying setup is confusing\" - interview #4",
    );
    expect(feedbackField).toHaveValue("");
  });

  it("does not render feedback source or quote field for validation-scorecard mode", () => {
    render(
      <ArtifactRefinementForm
        artifactType="validation-scorecard"
        isLoading={false}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText("Feedback source or quote")).not.toBeInTheDocument();
  });
});
