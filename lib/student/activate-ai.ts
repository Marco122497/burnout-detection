import { after } from "next/server";

let warming = false;

/** Wake the burnout AI after the response, without reloading the signed-in page. */
export function activateBurnoutAi() {
  if (warming) return;
  warming = true;

  after(() => {
    void (async () => {
      try {
        const { warmBurnoutAi } = await import("@/lib/student/ai-client");
        await warmBurnoutAi();
      } catch (error) {
        console.error("activateBurnoutAi:", error);
      } finally {
        // Layouts call this on every navigation. Hold the lock so a slow
        // health check cannot stack and rotate the auth session.
        setTimeout(() => {
          warming = false;
        }, 60_000);
      }
    })();
  });
}
