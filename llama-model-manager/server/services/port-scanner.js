import { execSync } from 'child_process'

export async function scanPorts(startPort = 8880, endPort = 8890) {
  const found = []

  for (let port = startPort; port <= endPort; port++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(500) })
      if (res.ok) {
        const pid = await getProcessByPort(port)
        found.push({ port, pid, external: true })
      }
    } catch {
    }
  }

  return found
}

function getProcessByPort(port) {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8', timeout: 2000 })
    const lines = output.trim().split('\n').filter(l => l.includes('LISTENING'))
    if (lines.length > 0) {
      const parts = lines[0].trim().split(/\s+/)
      return parseInt(parts[parts.length - 1], 10) || null
    }
  } catch {}
  return null
}
