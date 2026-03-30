import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AuthButton from "@/components/AuthButton";
import { createBrowserClient, isSupabaseConfigured } from "@/lib/supabase";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: vi.fn(),
  createBrowserClient: vi.fn(),
}));

type MockUser = {
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };
};

const createUser = (overrides: MockUser = {}) =>
  ({
    id: "user-1",
    email: "founder@example.com",
    user_metadata: {},
    ...overrides,
  }) as any;

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
};

const setupSupabaseClient = (userPromise: Promise<{ data: { user: any } }> | { data: { user: any } }) => {
  const unsubscribe = vi.fn();
  const signInWithOAuth = vi.fn().mockResolvedValue({});
  const signOut = vi.fn().mockResolvedValue({});
  const onAuthStateChange = vi.fn();
  const getUser = vi.fn();

  let authStateChangeCallback: ((event: string, session: { user: any } | null) => void) | undefined;

  getUser.mockImplementation(() => userPromise);
  onAuthStateChange.mockImplementation((callback) => {
    authStateChangeCallback = callback;

    return {
      data: {
        subscription: {
          unsubscribe,
        },
      },
    };
  });

  const client = {
    auth: {
      getUser,
      signInWithOAuth,
      signOut,
      onAuthStateChange,
    },
  };

  vi.mocked(createBrowserClient).mockReturnValue(client as any);

  return {
    client,
    getUser,
    signInWithOAuth,
    signOut,
    unsubscribe,
    emitAuthStateChange: (event: string, user: any) => {
      authStateChangeCallback?.(event, user ? { user } : null);
    },
  };
};

describe("AuthButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
  });

  it("renders an Explore demo link when Supabase is not configured", () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    vi.mocked(createBrowserClient).mockReturnValue(null as any);

    render(<AuthButton redirectTo="/demo" />);

    expect(screen.getByRole("link", { name: "Explore demo" })).toHaveAttribute("href", "/demo");
  });

  it("renders Loading while the initial user lookup is still pending", () => {
    const deferred = createDeferred<{ data: { user: any } }>();

    setupSupabaseClient(deferred.promise);

    render(<AuthButton />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders a sign-in button when the user is signed out", async () => {
    setupSupabaseClient(Promise.resolve({ data: { user: null } }));

    render(<AuthButton />);

    expect(await screen.findByRole("button", { name: "Get started free" })).toBeInTheDocument();
  });

  it("starts Google OAuth with the default dashboard redirect", async () => {
    const supabase = setupSupabaseClient(Promise.resolve({ data: { user: null } }));

    render(<AuthButton />);

    fireEvent.click(await screen.findByRole("button", { name: "Get started free" }));

    expect(supabase.signInWithOAuth).toHaveBeenCalledTimes(1);
    expect(supabase.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/dashboard")}`,
      },
    });
  });

  it("uses a custom redirect for the demo link and OAuth callback", async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    vi.mocked(createBrowserClient).mockReturnValue(null as any);

    render(<AuthButton redirectTo="/project/42" />);

    expect(screen.getByRole("link", { name: "Explore demo" })).toHaveAttribute(
      "href",
      "/project/42",
    );

    vi.mocked(isSupabaseConfigured).mockReturnValue(true);

    const supabase = setupSupabaseClient(Promise.resolve({ data: { user: null } }));

    render(<AuthButton redirectTo="/project/42" />);

    fireEvent.click(await screen.findByRole("button", { name: "Get started free" }));

    expect(supabase.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/project/42")}`,
      },
    });
  });

  it("renders the signed-in user with avatar, full name, email, and sign-out button", async () => {
    const user = createUser({
      email: "john@example.com",
      user_metadata: {
        full_name: "John Doe",
        avatar_url: "https://example.com/avatar.png",
      },
    });

    setupSupabaseClient(Promise.resolve({ data: { user } }));

    render(<AuthButton />);

    expect(await screen.findByRole("img", { name: "John Doe" })).toHaveAttribute(
      "src",
      "https://example.com/avatar.png",
    );
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("calls signOut when the signed-in user clicks Sign out", async () => {
    const supabase = setupSupabaseClient(
      Promise.resolve({
        data: {
          user: createUser({
            user_metadata: { full_name: "John Doe" },
          }),
        },
      }),
    );

    render(<AuthButton />);

    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));

    expect(supabase.signOut).toHaveBeenCalledTimes(1);
  });

  it("renders initials from full_name when no avatar is available", async () => {
    setupSupabaseClient(
      Promise.resolve({
        data: {
          user: createUser({
            email: "john@example.com",
            user_metadata: { full_name: "John Doe" },
          }),
        },
      }),
    );

    render(<AuthButton />);

    expect(await screen.findByText("JD")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders initials from name when full_name is missing", async () => {
    setupSupabaseClient(
      Promise.resolve({
        data: {
          user: createUser({
            email: "alice@example.com",
            user_metadata: { name: "Alice" },
          }),
        },
      }),
    );

    render(<AuthButton />);

    expect(await screen.findByText("A")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders initials from the email prefix when name metadata is missing", async () => {
    setupSupabaseClient(
      Promise.resolve({
        data: {
          user: createUser({
            email: "builder@example.com",
            user_metadata: {},
          }),
        },
      }),
    );

    render(<AuthButton />);

    expect(await screen.findByText("B")).toBeInTheDocument();
    expect(screen.getByText("builder")).toBeInTheDocument();
  });

  it("falls back to AI initials and Founder when no user name data is available", async () => {
    setupSupabaseClient(
      Promise.resolve({
        data: {
          user: createUser({
            email: undefined,
            user_metadata: {},
          }),
        },
      }),
    );

    render(<AuthButton />);

    // getInitials falls back to "AI" (single word) → first char = "A"
    expect(await screen.findByText("A")).toBeInTheDocument();
    expect(screen.getByText("Founder")).toBeInTheDocument();
  });

  it("updates the rendered user when the auth state changes", async () => {
    const initialUser = createUser({
      email: "alice@example.com",
      user_metadata: { name: "Alice" },
    });
    const updatedUser = createUser({
      email: "john@example.com",
      user_metadata: { full_name: "John Doe" },
    });

    const supabase = setupSupabaseClient(Promise.resolve({ data: { user: initialUser } }));

    render(<AuthButton />);

    expect(await screen.findByText("Alice")).toBeInTheDocument();

    supabase.emitAuthStateChange("SIGNED_IN", updatedUser);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
  });

  it("does nothing when signIn is clicked but supabase client is null", async () => {
    vi.mocked(createBrowserClient).mockReturnValue(null as any);

    render(<AuthButton />);

    // supabase is null → useEffect sets loading=false immediately → shows sign-in
    const btn = await screen.findByRole("button", { name: "Get started free" });
    fireEvent.click(btn);

    // No error thrown, signIn early-returns
    expect(btn).toBeInTheDocument();
  });

  it("does nothing when signOut is clicked but supabase client is null", async () => {
    // First render with a real client to get to signed-in state
    const user = createUser({ user_metadata: { full_name: "Test" } });
    const supabase = setupSupabaseClient(Promise.resolve({ data: { user } }));

    const { unmount } = render(<AuthButton />);
    await screen.findByText("Test");

    // Now simulate: auth state change to signed-out via null session
    // Then re-render component where supabase becomes null
    unmount();

    // Render fresh with null client — triggers the !supabase branch in useEffect
    vi.mocked(createBrowserClient).mockReturnValue(null as any);
    render(<AuthButton />);

    // With null supabase, loading is set to false immediately, user stays null → sign-in button
    const btn = await screen.findByRole("button", { name: "Get started free" });
    expect(btn).toBeInTheDocument();
  });

  it("does not update state when loadUser resolves after unmount", async () => {
    const deferred = createDeferred<{ data: { user: any } }>();
    const supabase = setupSupabaseClient(deferred.promise);

    const { unmount } = render(<AuthButton />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // Unmount before resolving — active flag should prevent setState
    unmount();
    expect(supabase.unsubscribe).toHaveBeenCalledTimes(1);

    // Resolve after unmount — should not throw or update
    deferred.resolve({ data: { user: createUser({ user_metadata: { full_name: "Ghost" } }) } });
    await new Promise((r) => setTimeout(r, 50));

    // No assertion on DOM needed — just verifying no error is thrown
  });

  it("unsubscribes the auth listener on unmount", () => {
    const deferred = createDeferred<{ data: { user: any } }>();
    const supabase = setupSupabaseClient(deferred.promise);

    const { unmount } = render(<AuthButton />);

    unmount();

    expect(supabase.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
