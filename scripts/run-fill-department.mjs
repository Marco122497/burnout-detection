import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !serviceKey || !anonKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const departmentId = Number(process.argv[2] || 20);
const skipExisting = process.argv.includes("--skip-existing");

// Dynamic import compiled TS modules via tsx
const { fillDepartmentMonitoring } = await import(
  "../lib/guidance/fill-department-monitoring.ts"
);

const supabase = createClient(url, serviceKey);

const result = await fillDepartmentMonitoring({
  supabase,
  departmentId,
  skipExisting,
});

console.log(JSON.stringify(result, null, 2));
