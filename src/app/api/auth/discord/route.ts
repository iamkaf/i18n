import { getEnv } from "@/lib/cf";

export const runtime = "edge";

const REDIRECT_URI =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000/api/auth/callback"
    : "https://i18n.kaf.sh/api/auth/callback";

export async function GET() {
  const env = getEnv();
  const clientId = (env as unknown as Record<string, string>).DISCORD_CLIENT_ID;
  if (!clientId) {
    return Response.json({ error: "Discord OAuth not configured" }, { status: 503 });
  }

  const stateBytes = crypto.getRandomValues(new Uint8Array(16));
  const state = Array.from(stateBytes, (b) => b.toString(16).padStart(2, "0")).join("");

  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "identify");
  url.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      "Set-Cookie": `__oauth_state=${state}; HttpOnly; SameSite=Lax; Secure; Path=/api/auth; Max-Age=600`,
    },
  });
}
