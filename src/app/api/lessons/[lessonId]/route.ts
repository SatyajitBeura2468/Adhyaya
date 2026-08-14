import { AuthorizationError, requireViewer, updateLesson } from "@/lib/dal";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  try { await updateLesson(await requireViewer(), (await params).lessonId, await request.json()); return Response.json({ ok: true }); }
  catch (error) { return Response.json({ message: error instanceof Error ? error.message : "Unable to save the lesson." }, { status: error instanceof AuthorizationError ? 403 : 400 }); }
}
