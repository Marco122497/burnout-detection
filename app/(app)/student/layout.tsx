import { after } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { activateBurnoutAi } from "@/lib/student/activate-ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user, profile } = await requireRole(["Student"]);

  activateBurnoutAi();

  // Finish interrupted submits after the response. AI wake is shared and
  // locked so it does not reload the page or clear the session.
  after(() => {
    void (async () => {
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
