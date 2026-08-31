import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing env");
  process.exit(1);
}

const admin = createClient(url, key);
const departmentId = Number(process.argv[2] || 20);

const { data: term } = await admin
  .from("academic_terms")
  .select("term_id, monitoring_week")
  .eq("is_active", true)
  .maybeSingle();

const { data: students } = await admin
  .from("profiles")
  .select("id, student_number")
  .eq("role", "Student")
  .eq("is_active", true)
  .eq("department_id", departmentId);

console.log("term", term, "students", students?.length);

const student = students?.[0];
if (!student || !term) process.exit(0);

const { data: row, error } = await admin
  .from("weekly_monitoring")
  .insert({
    student_id: student.id,
    term_id: term.term_id,
    week_number: term.monitoring_week,
    stress_score: 18,
    academic_workload_score: 5,
    study_time_score: 12,
    sleep_hours_score: 35,
    status: "Submitted",
    remarks: "script test",
  })
  .select("monitoring_id")
  .single();

console.log("insert", error?.message || row);

if (row?.monitoring_id) {
  await admin
    .from("weekly_monitoring")
    .delete()
    .eq("monitoring_id", row.monitoring_id);
  console.log("cleaned up test row");
}
