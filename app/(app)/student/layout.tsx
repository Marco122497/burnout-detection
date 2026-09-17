import { after } from "next/server";

import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user, profile } = await requireRole(["Student"]);

  // Wake AI + finish interrupted submits after the response (keeps layout lean for HMR).
  after(() => {
    void (async () => {
      try {
        const { warmBurnoutAi } = await import("@/lib/student/ai-client");
        await warmBurnoutAi();
      } catch (error) {
        console.error("warmBurnoutAi:", error);
      }

      try {
        const { ensureCurrentWeekMonitoringFinalized } = await import(
          "@/lib/student/finalize-monitoring"
        );
        await ensureCurrentWeekMonitoringFinalized(supabase, user.id, profile);
      } catch (error) {
        console.error("ensureCurrentWeekMonitoringFinalized:", error);
      }
    })();
  });

  return children;
}
