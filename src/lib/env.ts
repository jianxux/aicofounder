export const OPENAI_API_KEY_ENV_VAR = "OPENAI_API_KEY";
export const NEXT_PUBLIC_SUPABASE_URL_ENV_VAR = "NEXT_PUBLIC_SUPABASE_URL";
export const NEXT_PUBLIC_SUPABASE_ANON_KEY_ENV_VAR = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

export const REQUIRED_ENV_VAR_NAMES = [
  OPENAI_API_KEY_ENV_VAR,
  NEXT_PUBLIC_SUPABASE_URL_ENV_VAR,
  NEXT_PUBLIC_SUPABASE_ANON_KEY_ENV_VAR,
] as const;

export type RequiredEnvVarName = (typeof REQUIRED_ENV_VAR_NAMES)[number];
export type RequiredEnv = Record<RequiredEnvVarName, string>;

export function validateEnv(env: NodeJS.ProcessEnv = process.env): RequiredEnv {
  const missingVars = REQUIRED_ENV_VAR_NAMES.filter((envVarName) => !env[envVarName]?.trim());

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}. Set them in your local .env file or Vercel project settings.`,
    );
  }

  return {
    OPENAI_API_KEY: env.OPENAI_API_KEY!.trim(),
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
  };
}
