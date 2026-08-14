import { AuthorizationError, createLesson, getWorkspaceBootstrap, requireViewer } from "@/lib/dal";

export const runtime = "nodejs";

export async function GET() {
  try { const context = await requireViewer(); return Response.json((await getWorkspaceBootstrap(context)).lessons); }
  catch (error) { return Response.json({ message: error instanceof Error ? error.message : "Unable to load lessons." }, { status: error instanceof AuthorizationError ? 401 : 500 }); }
}

export async function POST(request: Request) {
  try { const lesson = await createLesson(await requireViewer(), await request.json()); return Response.json(lesson, { status: 201 }); }
  catch (error) { return Response.json({ message: error instanceof Error ? error.message : "Unable to create a lesson." }, { status: error instanceof AuthorizationError ? 403 : 400 }); }
}
