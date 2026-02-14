export function computePlaceholderSig(text: string): string {
  const tokens: string[] = [];

  // printf-style: %s, %d, %1$s, etc
  const printf = text.match(/%\d*\$?[a-zA-Z]/g);
  if (printf) tokens.push(...printf.map((t) => t.toLowerCase()));

  // brace-style: {0}, {name}
  const braces = text.match(/\{[^}]+\}/g);
  if (braces) tokens.push(...braces.map((t) => t));

  // Minecraft format codes: §a, §l, etc (treat as placeholders to preserve)
  const mc = text.match(/§[0-9a-fklmnor]/gi);
  if (mc) tokens.push(...mc.map((t) => t.toLowerCase()));

  tokens.sort();
  return tokens.join('|');
}
