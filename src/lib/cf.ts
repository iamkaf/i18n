import { getCloudflareContext } from '@opennextjs/cloudflare';

export function getEnv() {
  const { env } = getCloudflareContext();
  return env as unknown as CloudflareEnv;
}
