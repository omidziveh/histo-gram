import type { Env } from '../types';

const RATE_LIMIT_REQUESTS = 5;
const RATE_LIMIT_WINDOW = 60; // seconds

export async function isRateLimited(chatId: number, env: Env): Promise<boolean> {
  const key = `rate_limit:${chatId}`;

  try {
    const { value: count } = await env.RATE_LIMIT_KV.getWithMetadata(key);

    if (count === null) {
      await env.RATE_LIMIT_KV.put(key, '1', { expirationTtl: RATE_LIMIT_WINDOW });
      return false;
    }

    const currentCount = parseInt(count, 10);
    if (currentCount >= RATE_LIMIT_REQUESTS) {
      return true;
    } else {
      await env.RATE_LIMIT_KV.put(key, (currentCount + 1).toString(), { expirationTtl: RATE_LIMIT_WINDOW });
      return false;
    }
  } catch (error) {
    console.error('Rate limiter failed:', error);
    return false;
  }
}