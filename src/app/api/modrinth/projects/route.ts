export const runtime = 'edge';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = url.searchParams.get('username')?.trim();
  if (!username) return new Response('username is required', { status: 400 });

  const res = await fetch(`https://api.modrinth.com/v2/user/${encodeURIComponent(username)}/projects`, {
    headers: {
      'User-Agent': 'i18n.kaf.sh (atelier)'
    }
  });

  if (!res.ok) {
    return new Response(`Modrinth error: ${res.status}`, { status: 502 });
  }

  const data = (await res.json()) as Array<any>;
  const mods = data
    .filter((p) => p?.project_type === 'mod')
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      icon_url: p.icon_url,
      project_type: p.project_type,
      updated: p.updated,
      published: p.published
    }));

  return Response.json({ ok: true, username, projects: mods });
}
