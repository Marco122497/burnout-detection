import { revalidateTag } from "next/cache";
import { after } from "next/server";

import { AI_STATUS_CACHE_TAG } from "@/lib/guidance/model-metrics";

/** Wake the burnout AI after the response, for Student, Instructor, and Guidance sign-in. */
export function activateBurnoutAi() {
  after(() => {
    void (async () => {
      try {
        const { warmBurnoutAi } = await import("@/lib/student/ai-client");
        const ready = await warmBurnoutAi();
        if (ready) {
          revalidateTag(AI_STATUS_CACHE_TAG, "max");
        }
      } catch (error) {
        console.error("activateBurnoutAi:", error);
      }
    })();
  });
}
