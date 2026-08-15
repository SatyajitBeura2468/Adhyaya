import { AuthorizationError, getCurriculumSetupCatalogue, requireViewer } from "@/lib/dal";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json(await getCurriculumSetupCatalogue(await requireViewer()));
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to load verified curriculum choices." }, { status: error instanceof AuthorizationError ? 401 : 500 });
  }
}
