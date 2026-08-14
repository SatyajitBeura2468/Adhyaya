import { AuthorizationError, requireViewer, saveSetup } from "@/lib/dal";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try { const context = await requireViewer(); await saveSetup(context, await request.json()); return Response.json({ ok: true }); }
  catch (error) { return Response.json({ message: error instanceof Error ? error.message : "Unable to save setup." }, { status: error instanceof AuthorizationError ? 403 : 400 }); }
}
