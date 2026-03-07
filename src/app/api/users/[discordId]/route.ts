import {
  GOD_DISCORD_ID,
  getUserRole,
  listManagedUsers,
  removeUserRole,
  requireGodSession,
  upsertUserRole,
  type UserRole,
} from "@/lib/session";

type MutableRole = Exclude<UserRole, "user">;

function parseMutableRole(value: unknown): MutableRole | null {
  return value === "trusted" || value === "god" ? value : null;
}

function isDiscordId(value: string): boolean {
  return /^\d{17,20}$/.test(value);
}

export async function GET(req: Request, { params }: { params: Promise<{ discordId: string }> }) {
  try {
    await requireGodSession(req);
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { discordId } = await params;
  if (!isDiscordId(discordId)) {
    return Response.json({ error: "Invalid Discord ID" }, { status: 422 });
  }

  const users = await listManagedUsers({ search: discordId, role: "all" });
  const user = users.find((entry) => entry.discord_id === discordId);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  return Response.json({ user });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ discordId: string }> }) {
  let session;
  try {
    session = await requireGodSession(req);
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { discordId } = await params;
  if (!isDiscordId(discordId)) {
    return Response.json({ error: "Invalid Discord ID" }, { status: 422 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    display_name?: string | null;
    role?: UserRole;
  };
  const displayName =
    typeof body.display_name === "string" ? body.display_name.trim() || null : null;
  const role = body.role === "user" ? "user" : parseMutableRole(body.role);

  if (!role) {
    return Response.json({ error: "Role must be user, trusted, or god" }, { status: 422 });
  }

  if (discordId === GOD_DISCORD_ID && role !== "god") {
    return Response.json({ error: "The configured god user cannot be demoted" }, { status: 409 });
  }

  if (role === "god" && discordId !== GOD_DISCORD_ID) {
    return Response.json(
      { error: "Only the configured Discord ID may hold the god role" },
      { status: 409 },
    );
  }

  if (role === "user") {
    await removeUserRole(discordId);
  } else {
    await upsertUserRole({
      discordId,
      displayName,
      role,
      addedByDiscordId: session.sub,
    });
  }

  return Response.json({
    ok: true,
    user: {
      discord_id: discordId,
      display_name: displayName,
      role: await getUserRole(discordId),
    },
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ discordId: string }> }) {
  try {
    await requireGodSession(req);
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { discordId } = await params;
  if (!isDiscordId(discordId)) {
    return Response.json({ error: "Invalid Discord ID" }, { status: 422 });
  }

  if (discordId === GOD_DISCORD_ID) {
    return Response.json({ error: "The configured god user cannot be demoted" }, { status: 409 });
  }

  await removeUserRole(discordId);
  return Response.json({ ok: true });
}
