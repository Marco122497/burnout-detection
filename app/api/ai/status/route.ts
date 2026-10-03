import { getBurnoutAiOnline } from "@/lib/student/ai-client";

export const dynamic = "force-dynamic";

export async function GET() {
  const online = await getBurnoutAiOnline();
  return Response.json(
    { online },
    { headers: { "Cache-Control": "no-store" } }
  );
}
