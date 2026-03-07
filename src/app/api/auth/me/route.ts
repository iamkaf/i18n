import { getSessionState } from "@/lib/session";

export async function GET(req: Request) {
  const session = await getSessionState(req);
  return Response.json(session);
}
