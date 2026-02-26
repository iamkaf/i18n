import { getSession } from "@/lib/session";

export const runtime = "edge";

export async function GET(req: Request) {
  const user = await getSession(req);
  return Response.json({ user });
}
