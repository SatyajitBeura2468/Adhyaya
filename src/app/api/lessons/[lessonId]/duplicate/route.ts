import { AuthorizationError, duplicateLesson, requireViewer } from "@/lib/dal";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  try { return Response.json(await duplicateLesson(await requireViewer(), (await params).lessonId), { status: 201 }); }
  catch (error) { return Response.json({ message: error instanceof Error ? error.message : "Unable to duplicate the lesson." }, { status: error instanceof AuthorizationError ? 403 : 400 }); }
}
