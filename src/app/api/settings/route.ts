import { assignCanonicalSubject, AuthorizationError, requireViewer } from "@/lib/dal";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await assignCanonicalSubject(await requireViewer(), await request.json());
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to save the curriculum assignment." }, { status: error instanceof AuthorizationError ? 403 : 400 });
  }
}
