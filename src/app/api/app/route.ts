import { ConfigurationError, AuthorizationError, getWorkspaceBootstrap, requireViewer } from "@/lib/dal";

export const runtime = "nodejs";

export async function GET() {
  try { return Response.json(await getWorkspaceBootstrap(await requireViewer())); }
  catch (error) {
    const status = error instanceof ConfigurationError ? 503 : error instanceof AuthorizationError ? 401 : 500;
    return Response.json({ message: error instanceof Error ? error.message : "Unable to load your workspace." }, { status });
  }
}
