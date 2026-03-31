import {
  NEXT_PUBLIC_SUPABASE_ANON_KEY_ENV_VAR,
  NEXT_PUBLIC_SUPABASE_URL_ENV_VAR,
  OPENAI_API_KEY_ENV_VAR,
  REQUIRED_ENV_VAR_NAMES,
  validateEnv,
} from "@/lib/env";

describe("validateEnv", () => {
  it("exports the expected required env var names", () => {
    expect(OPENAI_API_KEY_ENV_VAR).toBe("OPENAI_API_KEY");
    expect(NEXT_PUBLIC_SUPABASE_URL_ENV_VAR).toBe("NEXT_PUBLIC_SUPABASE_URL");
    expect(NEXT_PUBLIC_SUPABASE_ANON_KEY_ENV_VAR).toBe("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(REQUIRED_ENV_VAR_NAMES).toEqual([
      "OPENAI_API_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]);
  });

  it("throws a descriptive error when all required env vars are missing", () => {
    expect(() => validateEnv({})).toThrowError(
      "Missing required environment variables: OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY. Set them in your local .env file or Vercel project settings.",
    );
  });

  it("throws a descriptive error when only some env vars are missing", () => {
    expect(() =>
      validateEnv({
        OPENAI_API_KEY: "test-key",
        NEXT_PUBLIC_SUPABASE_URL: "   ",
      }),
    ).toThrowError(
      "Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY. Set them in your local .env file or Vercel project settings.",
    );
  });

  it("returns trimmed values when all required env vars are present", () => {
    expect(
      validateEnv({
        OPENAI_API_KEY: " test-key ",
        NEXT_PUBLIC_SUPABASE_URL: " https://example.supabase.co ",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: " anon-key ",
      }),
    ).toEqual({
      OPENAI_API_KEY: "test-key",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });
  });

  it("reads from process.env by default", () => {
    const originalOpenAiKey = process.env.OPENAI_API_KEY;
    const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    process.env.OPENAI_API_KEY = "runtime-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://runtime.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "runtime-anon-key";

    expect(validateEnv()).toEqual({
      OPENAI_API_KEY: "runtime-key",
      NEXT_PUBLIC_SUPABASE_URL: "https://runtime.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "runtime-anon-key",
    });

    if (originalOpenAiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalOpenAiKey;
    }

    if (originalSupabaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
    }

    if (originalSupabaseAnonKey === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalSupabaseAnonKey;
    }
  });
});
