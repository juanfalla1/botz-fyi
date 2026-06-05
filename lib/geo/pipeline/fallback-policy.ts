export function shouldReturnUnavailableAnalysis(input: {
  totalResults: number
  liveResults: number
  configuredProviders: number
}) {
  if (input.configuredProviders === 0) return true
  if (input.totalResults === 0) return true
  if (input.liveResults === 0) return true
  return false
}
