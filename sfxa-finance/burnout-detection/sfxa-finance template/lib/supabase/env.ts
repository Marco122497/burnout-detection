function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.includes("your-project") || value.includes("your-anon")) {
    throw new Error(
      `Missing ${name}. Add your Supabase credentials to .env.local (see .env.example).`
    );
  }

  return value;
}

export function getSupabaseEnv() {
  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}
