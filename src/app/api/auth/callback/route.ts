import { getEnv } from "@/lib/cf";
import { sessionCookie, signSession, syncElevatedUserProfile } from "@/lib/session";

const REDIRECT_URI =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000/api/auth/callback"
    : "https://i18n.kaf.sh/api/auth/callback";

type DiscordUser = {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
};

function parseCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = parseCookie(req, "__oauth_state");

  if (!code || !state || !storedState || state !== storedState) {
    return Response.json({ error: "Invalid OAuth state" }, { status: 400 });
  }

  const env = getEnv();
  const clientId = (env as unknown as Record<string, string>).DISCORD_CLIENT_ID;
  const clientSecret = (env as unknown as Record<string, string>).DISCORD_CLIENT_SECRET;
  const sessionSecret = (env as unknown as Record<string, string>).SESSION_SECRET;

  if (!clientId || !clientSecret || !sessionSecret) {
    return Response.json({ error: "OAuth not configured" }, { status: 503 });
  }

  // Exchange code for token
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!tokenRes.ok) {
    return Response.json({ error: "Failed to exchange OAuth code" }, { status: 502 });
  }

  const tokenData = (await tokenRes.json()) as { access_token: string };

  // Fetch user info
  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) {
    return Response.json({ error: "Failed to fetch Discord user" }, { status: 502 });
  }

  const user = (await userRes.json()) as DiscordUser;
  const displayName = user.global_name ?? user.username;
  const handle = user.username;
  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : null;

  await syncElevatedUserProfile({
    discordId: user.id,
    displayName,
    discordHandle: handle,
    avatarUrl,
  });

  const token = await signSession(
    { sub: user.id, name: displayName, handle, avatar: avatarUrl },
    sessionSecret,
  );

  return new Response(null, {
    status: 302,
    headers: new Headers([
      ["Location", "/"],
      ["Set-Cookie", sessionCookie(token)],
      ["Set-Cookie", "__oauth_state=; HttpOnly; SameSite=Lax; Secure; Path=/api/auth; Max-Age=0"],
    ]),
  });
}
