const cache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL = 60_000

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T
  return null
}

export function setCached(key: string, data: unknown): void {
  cache.set(key, { data, ts: Date.now() })
}
