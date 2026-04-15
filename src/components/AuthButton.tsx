"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { trackEvent } from "@/lib/analytics";
import { createBrowserClient, isSupabaseConfigured } from "@/lib/supabase";

type AuthButtonProps = {
  redirectTo?: string;
  label?: string;
  className?: string;
  analyticsButton?: string;
  analyticsPage?: string;
  beforeAction?: () => void;
};

function getInitials(user: User) {
  const fullName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "AI";

  return fullName
    .split(" ")
    .slice(0, 2)
    .map((part: string) => part.charAt(0).toUpperCase())
    .join("");
}

export default function AuthButton({
  redirectTo = "/dashboard",
  label = "Continue with Google",
  className,
  analyticsButton,
  analyticsPage,
  beforeAction,
}: AuthButtonProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createBrowserClient(), []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    const loadUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (active) {
        setUser(currentUser);
        setLoading(false);
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === "SIGNED_IN" && session?.user) {
        void trackEvent("login_success", {
          provider: "google",
          user_id: session.user.id,
        });
      }

      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = async () => {
    if (!supabase) {
      return;
    }

    beforeAction?.();

    const origin = window.location.origin;
    if (analyticsButton) {
      void trackEvent("cta_click", {
        page: analyticsPage ?? window.location.pathname,
        button: analyticsButton,
      });
    }
    void trackEvent("login_attempt", {
      provider: "google",
      redirect_to: redirectTo,
    });

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });
  };

  const signOut = async () => {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
  };

  if (!isSupabaseConfigured()) {
    return (
      <Link
        href={redirectTo}
        onClick={() => {
          beforeAction?.();

          if (!analyticsButton) {
            return;
          }

          void trackEvent("cta_click", {
            page: analyticsPage ?? window.location.pathname,
            button: analyticsButton,
          });
        }}
        className="inline-flex items-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:border-stone-400 hover:bg-stone-50"
      >
        Explore demo
      </Link>
    );
  }

  if (loading) {
    return (
      <div className="inline-flex min-w-28 items-center justify-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-500 shadow-sm">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={signIn}
        className={
          className ??
          "inline-flex items-center rounded-full bg-stone-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800"
        }
      >
        {label}
      </button>
    );
  }

  const fullName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "Founder";

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;

  return (
    <div className="flex items-center gap-3 rounded-full border border-stone-200 bg-white px-3 py-2 shadow-sm">
      {avatarUrl ? (
        <img src={avatarUrl} alt={fullName} className="h-9 w-9 rounded-full object-cover" />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-900 text-xs font-semibold text-white">
          {getInitials(user)}
        </div>
      )}
      <div className="hidden text-left sm:block">
        <div className="text-sm font-semibold text-stone-900">{fullName}</div>
        <div className="text-xs text-stone-500">{user.email}</div>
      </div>
      <button
        type="button"
        onClick={signOut}
        className="rounded-full border border-stone-200 px-3 py-1.5 text-sm text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
      >
        Sign out
      </button>
    </div>
  );
}
