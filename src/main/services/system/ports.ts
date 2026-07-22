import { createSocket } from 'dgram'

export function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = createSocket('udp4')
    sock.on('error', () => {
      sock.close()
      resolve(false)
    })
    sock.bind(port, '0.0.0.0', () => {
      sock.close()
      resolve(true)
    })
  })
}

export async function allocatePort(startPort: number, usedPorts: Set<number>): Promise<number> {
  let port = startPort
  while (port < 65535) {
    if (!usedPorts.has(port) && (await isPortFree(port))) {
      return port
    }
    port++
  }
  throw new Error(`No free port found starting from ${startPort}`)
}

export function collectUsedPorts(
  instances: Array<{ PalworldSettings: Record<string, unknown>; settings: { queryPort: number } }>
): Set<number> {
  const used = new Set<number>()
  for (const inst of instances) {
    used.add(Number(inst.PalworldSettings.PublicPort) || 8211)
    used.add(inst.settings.queryPort)
    used.add(Number(inst.PalworldSettings.RCONPort) || 25575)
    used.add(Number(inst.PalworldSettings.RESTAPIPort) || 8212)
  }
  return used
}

export function validatePortsUnique(
  existingInstances: Array<{
    id: string
    name: string
    PalworldSettings: Record<string, unknown>
    settings: { queryPort: number }
  }>,
  portsToCheck: { queryPort: number; publicPort: number; rconPort: number; restPort: number },
  skipInstanceId?: string
): string | null {
  const { queryPort, publicPort, rconPort, restPort } = portsToCheck

  const toCheck = [publicPort, queryPort, rconPort, restPort]
  if (new Set(toCheck).size !== toCheck.length) {
    return 'All 4 ports (Public, Query, RCON, REST API) must be different from each other.'
  }

  for (const inst of existingInstances) {
    if (skipInstanceId && inst.id === skipInstanceId) continue
    const taken = [
      Number(inst.PalworldSettings.PublicPort) || 8211,
      inst.settings.queryPort,
      Number(inst.PalworldSettings.RCONPort) || 25575,
      Number(inst.PalworldSettings.RESTAPIPort) || 8212
    ]

    if (taken.includes(publicPort))
      return `Port ${publicPort} (Public) is already in use by "${inst.name}".`
    if (taken.includes(queryPort))
      return `Port ${queryPort} (Query) is already in use by "${inst.name}".`
    if (taken.includes(rconPort))
      return `Port ${rconPort} (RCON) is already in use by "${inst.name}".`
    if (taken.includes(restPort))
      return `Port ${restPort} (REST API) is already in use by "${inst.name}".`
  }
  return null
}
