import { GOD_DISCORD_ID, requireSession, upsertUserRole } from "@/lib/session";

function forbidden() {
  return Response.json({ error: "Not available" }, { status: 404 });
}

function isLocalRequest(req: Request) {
  const url = new URL(req.url);
  return ["localhost", "127.0.0.1"].includes(url.hostname);
}

export async function GET(req: Request) {
  if (process.env.NODE_ENV !== "development" || !isLocalRequest(req)) {
    return forbidden();
  }

  let session;
  try {
    session = await requireSession(req);
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const url = new URL(req.url);
  const redirectTo = (url.searchParams.get("redirect") || "/").trim() || "/";
  const requestedRole = (url.searchParams.get("role") || "").trim().toLowerCase();
  const role =
    requestedRole === "trusted" ? "trusted" : session.sub === GOD_DISCORD_ID ? "god" : "trusted";
  if (!redirectTo.startsWith("/")) {
    return Response.json({ error: "redirect must be a relative path" }, { status: 400 });
  }

  try {
    await upsertUserRole({
      discordId: session.sub,
      displayName: session.name,
      role,
      addedByDiscordId: "dev-promote",
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Role update failed" },
      { status: 409 },
    );
  }

  return new Response(null, {
    status: 302,
    headers: { Location: redirectTo },
  });
}
