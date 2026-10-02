import { warmBurnoutAi } from "@/lib/student/ai-client";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

let warming = false;

/** Public wake used by the landing page. Guests have no dashboard layout to warm the AI. */
export async function GET() {
  if (!warming) {
    warming = true;
    try {
      const ready = await warmBurnoutAi();
      console.info(
        `Landing page woke burnout AI: ${ready ? "online" : "still starting"}`
      );
    } catch (error) {
      console.error("Landing page AI wake:", error);
    } finally {
      setTimeout(() => {
        warming = false;
      }, 60_000);
    }
  }

  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
