import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const KEEP_EMAIL = "guidance@school.edu";
const dryRun = process.argv.includes("--dry-run");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function listAllUsers() {
  const users = [];
  const perPage = 1000;

  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < perPage) break;
  }

  return users;
}

function chunk(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

async function deleteWhereIn(table, column, ids) {
  if (ids.length === 0) return 0;

  let deleted = 0;
  for (const batch of chunk(ids, 100)) {
    const { error, count } = await admin
      .from(table)
      .delete({ count: "exact" })
      .in(column, batch);
    if (error) {
      throw new Error(`${table}.${column}: ${error.message}`);
    }
    deleted += count ?? 0;
  }

  return deleted;
}

async function main() {
  const users = await listAllUsers();
  const keepUser = users.find(
    (user) => user.email?.toLowerCase() === KEEP_EMAIL.toLowerCase()
  );

  if (!keepUser) {
    console.error(`Keep account not found: ${KEEP_EMAIL}`);
    process.exit(1);
  }

  const deleteUsers = users.filter((user) => user.id !== keepUser.id);
  const deleteIds = deleteUsers.map((user) => user.id);

  console.log(`Found ${users.length} user(s).`);
  console.log(`Keeping: ${keepUser.email} (${keepUser.id})`);
  console.log(`Deleting: ${deleteUsers.length} user(s).`);

  if (deleteUsers.length === 0) {
    console.log("Nothing to delete.");
    return;
  }

  if (dryRun) {
    console.log("\nDry run — users that would be deleted:");
    for (const user of deleteUsers) {
      console.log(`- ${user.email ?? "(no email)"} (${user.id})`);
    }
    return;
  }

  const counselingDeleted = await deleteWhereIn(
    "counseling_records",
    "student_id",
    deleteIds
  );
  const counselingCounselorDeleted = await deleteWhereIn(
    "counseling_records",
    "guidance_counselor_id",
    deleteIds
  );
  const monitoringDeleted = await deleteWhereIn(
    "weekly_monitoring",
    "student_id",
    deleteIds
  );
  const notificationsDeleted = await deleteWhereIn(
    "notifications",
    "user_id",
    deleteIds
  );
  const announcementsDeleted = await deleteWhereIn(
    "announcements",
    "created_by",
    deleteIds
  );

  console.log("\nCleaned related records:");
  console.log(`- counseling_records (student): ${counselingDeleted}`);
  console.log(
    `- counseling_records (counselor): ${counselingCounselorDeleted}`
  );
  console.log(`- weekly_monitoring: ${monitoringDeleted}`);
  console.log(`- notifications: ${notificationsDeleted}`);
  console.log(`- announcements: ${announcementsDeleted}`);

  let deleted = 0;
  const failures = [];

  for (const user of deleteUsers) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      failures.push(`${user.email ?? user.id}: ${error.message}`);
      continue;
    }
    deleted += 1;
    console.log(`Deleted ${user.email ?? user.id}`);
  }

  console.log(`\nDone. Deleted ${deleted}/${deleteUsers.length} user(s).`);

  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const failure of failures) {
      console.log(`- ${failure}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
