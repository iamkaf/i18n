export type CatalogString = {
  key: string;
  text: string;
};

function visitNode(node: unknown, prefix: string, out: CatalogString[]) {
  if (typeof node === "string") {
    out.push({ key: prefix, text: node });
    return;
  }

  if (!node || typeof node !== "object" || Array.isArray(node)) {
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    visitNode(value, nextPrefix, out);
  }
}

export function parseLocaleCatalogContent(content: string): CatalogString[] {
  const parsed = JSON.parse(content) as unknown;
  const out: CatalogString[] = [];
  visitNode(parsed, "", out);
  return out;
}
