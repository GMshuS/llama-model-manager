export function parseTokensPerSecond(text) {
  const patterns = [
    /(\d+\.?\d*)\s*tokens\/s/,
    /(\d+\.?\d*)\s*t\/s/,
    /speed:\s*(\d+\.?\d*)/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return parseFloat(match[1])
  }
  return null
}

export function parseMemoryMB(text) {
  const match = text.match(/(\d+\.?\d*)\s*(MB|MiB)/i)
  if (match && parseFloat(match[1]) > 100) return parseFloat(match[1])
  return null
}
