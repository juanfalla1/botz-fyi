export function computeNextRetryAt(retryCount: number) {
  const minutes = Math.min(30, Math.max(1, 2 ** retryCount))
  return new Date(Date.now() + minutes * 60_000).toISOString()
}

export function shouldRetry(retryCount: number, maxRetries: number) {
  return retryCount < maxRetries
}
