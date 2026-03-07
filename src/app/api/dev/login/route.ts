import { getEnv } from "@/lib/cf";
import { GOD_DISCORD_ID } from "@/lib/auth-constants";
import { sessionCookie, signSession, upsertUserRole } from "@/lib/session";

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

  const env = getEnv() as unknown as Record<string, string | undefined>;
  const sessionSecret = env.SESSION_SECRET?.trim();
  if (!sessionSecret) {
    return Response.json({ error: "SESSION_SECRET is not configured" }, { status: 503 });
  }

  const url = new URL(req.url);
  const sub = (url.searchParams.get("sub") || "dev-user").trim();
  const name = (url.searchParams.get("name") || "Dev User").trim();
  const handle = (url.searchParams.get("handle") || "").trim().replace(/^@+/, "") || null;
  const avatar = (url.searchParams.get("avatar") || "").trim() || null;
  const redirectTo = (url.searchParams.get("redirect") || "/").trim() || "/";
  const requestedRole = (url.searchParams.get("role") || "").trim().toLowerCase();
  const role =
    sub === GOD_DISCORD_ID
      ? "god"
      : requestedRole === "god"
        ? "god"
        : requestedRole === "trusted" || url.searchParams.get("trusted") === "1"
          ? "trusted"
          : null;

  if (!sub || !name) {
    return Response.json({ error: "sub and name are required" }, { status: 400 });
  }

  if (!redirectTo.startsWith("/")) {
    return Response.json({ error: "redirect must be a relative path" }, { status: 400 });
  }

  if (role) {
    try {
      await upsertUserRole({
        discordId: sub,
        displayName: name,
        discordHandle: handle,
        avatarUrl: avatar,
        role,
        addedByDiscordId: "dev-login",
      });
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Role update failed" },
        { status: 409 },
      );
    }
  }

  const token = await signSession({ sub, name, handle, avatar }, sessionSecret);

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectTo,
      "Set-Cookie": sessionCookie(token),
    },
  });
}
