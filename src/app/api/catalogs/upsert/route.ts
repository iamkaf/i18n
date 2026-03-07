import { requireTokenScopes } from "@/lib/auth";
import { type CatalogUpsertPayload, upsertProjectLocaleCatalog } from "@/lib/project-imports";

function bad(msg: string, status = 400) {
  return new Response(msg, { status });
}

export async function POST(req: Request) {
  await requireTokenScopes(req, ["catalog:write"]);

  let payload: CatalogUpsertPayload;
  try {
    payload = (await req.json()) as CatalogUpsertPayload;
  } catch {
    return bad("Invalid JSON");
  }

  if (!payload?.mod?.slug || !payload?.mod?.name) return bad("mod.slug and mod.name are required");
  if (!payload?.locale) return bad("locale is required");
  if (!Array.isArray(payload?.strings)) return bad("strings must be an array");

  const visibility = payload.mod.visibility ?? "private";
  if (visibility !== "public" && visibility !== "private")
    return bad("mod.visibility must be public|private");
  try {
    return Response.json(await upsertProjectLocaleCatalog(payload));
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Catalog upsert failed", {
      status: 500,
    });
  }
}
