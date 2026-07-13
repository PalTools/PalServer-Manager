export interface PersistedPlayer {
  userId: string
  playerId: string
  name: string
  lastIp: string
  lastPing: number
  location_x: number
  location_y: number
  level: number
  firstSeen: number
  lastSeen: number
  playTimeSeconds: number
  status: 'online' | 'offline' | 'banned'
  reason?: string
}

const api = window.palServerManager

export async function getPlayers(id: string): Promise<PersistedPlayer[]> {
  return (await api.getPlayers(id)) as PersistedPlayer[]
}

export async function kickPlayer(id: string, userId: string, message: string): Promise<void> {
  await api.kickPlayer(id, userId, message)
}

export async function banPlayer(id: string, userId: string, message: string): Promise<void> {
  await api.banPlayer(id, userId, message)
}

export async function unbanPlayer(id: string, userId: string): Promise<void> {
  await api.unbanPlayer(id, userId)
}

export async function announce(id: string, message: string): Promise<void> {
  await api.announce(id, message)
}
