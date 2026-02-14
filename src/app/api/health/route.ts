export const runtime = 'edge';

export async function GET() {
  return Response.json({ ok: true, service: 'i18n.kaf.sh' });
}
