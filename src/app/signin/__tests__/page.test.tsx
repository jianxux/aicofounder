import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SignInPage from "@/app/signin/page";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/AuthButton", () => ({
  default: (props: { redirectTo?: string; label?: string }) => (
    <div
      data-testid="auth-button"
      data-redirect-to={props.redirectTo}
      data-label={props.label}
    />
  ),
}));

describe("SignInPage", () => {
  async function renderPage(searchParams?: Record<string, string | string[] | undefined>) {
    const page = await SignInPage({
      searchParams: Promise.resolve(searchParams ?? {}),
    });

    return render(page);
  }

  it("renders AI Cofounder sign-in copy and AuthButton", async () => {
    await renderPage();

    expect(
      screen.getByRole("heading", { name: "Sign in to your AI Cofounder workspace" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Returning founders")).toBeInTheDocument();
    expect(screen.getByTestId("auth-button")).toBeInTheDocument();
    expect(screen.getByTestId("auth-button")).toHaveAttribute("data-label", "Continue with Google");
  });

  it("passes /dashboard by default", async () => {
    await renderPage();

    expect(screen.getByTestId("auth-button")).toHaveAttribute("data-redirect-to", "/dashboard");
  });

  it("passes a safe internal next path", async () => {
    await renderPage({ next: "/project/42?view=plan#tasks" });

    expect(screen.getByTestId("auth-button")).toHaveAttribute(
      "data-redirect-to",
      "/project/42?view=plan#tasks",
    );
  });

  it("rejects external next values and protocol-relative URLs back to /dashboard", async () => {
    const utils = await renderPage({ next: "https://evil.example/path" });

    expect(screen.getByTestId("auth-button")).toHaveAttribute("data-redirect-to", "/dashboard");

    utils.rerender(
      await SignInPage({
        searchParams: Promise.resolve({ next: "//evil.example/path" }),
      }),
    );

    expect(screen.getByTestId("auth-button")).toHaveAttribute("data-redirect-to", "/dashboard");
  });

  it("includes the secondary demo explore link", async () => {
    await renderPage();

    expect(screen.getByRole("link", { name: "Explore the demo dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});
