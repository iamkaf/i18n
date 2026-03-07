import {
  GOD_DISCORD_ID,
  getUserRole,
  listManagedUsers,
  requireGodSession,
  upsertUserRole,
  type UserRole,
} from "@/lib/session";

type MutableRole = Exclude<UserRole, "user">;

function isDiscordId(value: string): boolean {
  return /^\d{17,20}$/.test(value);
}

function parseMutableRole(value: unknown): MutableRole | null {
  return value === "trusted" || value === "god" ? value : null;
}

export async function GET(req: Request) {
  try {
    await requireGodSession(req);
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const url = new URL(req.url);
  const role =
    parseMutableRole(url.searchParams.get("role")) ??
    (url.searchParams.get("role") === "all" ? "all" : "all");
  const search = (url.searchParams.get("search") || "").trim();
  const users = await listManagedUsers({ role, search });
  return Response.json({ users, god_discord_id: GOD_DISCORD_ID });
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireGodSession(req);
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const body = (await req.json().catch(() => ({}))) as {
    discord_id?: string;
    display_name?: string | null;
    role?: string;
  };

  const discordId = (body.discord_id || "").trim();
  const role = parseMutableRole(body.role);
  const displayName =
    typeof body.display_name === "string" ? body.display_name.trim() || null : null;

  if (!isDiscordId(discordId)) {
    return Response.json({ error: "A valid Discord ID is required" }, { status: 422 });
  }

  if (!role) {
    return Response.json({ error: "Role must be trusted or god" }, { status: 422 });
  }

  if (role === "god" && discordId !== GOD_DISCORD_ID) {
    return Response.json(
      { error: "Only the configured Discord ID may hold the god role" },
      { status: 409 },
    );
  }

  await upsertUserRole({
    discordId,
    displayName,
    role,
    addedByDiscordId: session.sub,
  });

  return Response.json({
    ok: true,
    user: {
      discord_id: discordId,
      display_name: displayName,
      role: await getUserRole(discordId),
    },
  });
}
