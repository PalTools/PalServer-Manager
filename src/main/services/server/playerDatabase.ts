import { existsSync, readFileSync, promises as fsPromises } from 'fs'
import { join } from 'path'
import { PlayerInfo } from './palworldApi'

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

export class PlayerDatabase {
  private dbPath: string
  private banlistPath: string
  private players: Map<string, PersistedPlayer> = new Map()
  private saveQueue: Promise<void> = Promise.resolve()

  constructor(installPath: string) {
    this.dbPath = join(installPath, 'players.json')
    this.banlistPath = join(installPath, 'Pal', 'Saved', 'SaveGames', 'banlist.txt')
    this.load()
  }

  private load(): void {
    if (existsSync(this.dbPath)) {
      try {
        const raw = readFileSync(this.dbPath, 'utf-8')
        const data = JSON.parse(raw) as PersistedPlayer[]
        this.players.clear()
        for (const p of data) {
          p.playTimeSeconds = p.playTimeSeconds || 0
          this.players.set(p.userId, p)
        }
      } catch (err: unknown) {
        console.error(`Failed to load players from ${this.dbPath}:`, err)
      }
    }
  }

  private save(): Promise<void> {
    const data = Array.from(this.players.values())
    const jsonStr = JSON.stringify(data, null, 2)

    this.saveQueue = this.saveQueue
      .then(() => fsPromises.writeFile(this.dbPath, jsonStr, 'utf-8'))
      .catch((err: unknown) => {
        console.error(`Failed to save players to ${this.dbPath}:`, err)
      })
    return this.saveQueue
  }

  private syncBanlist(): void {
    if (!existsSync(this.banlistPath)) return

    try {
      const raw = readFileSync(this.banlistPath, 'utf-8')
      const lines = raw
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0)

      const bannedUserIds = new Set<string>()
      for (const line of lines) {
        const parts = line.split(',')
        if (parts.length > 0) {
          bannedUserIds.add(parts[0])
        }
      }

      let changed = false

      this.players.forEach((p) => {
        if (bannedUserIds.has(p.userId) && p.status !== 'banned') {
          p.status = 'banned'
          changed = true
        }
      })

      bannedUserIds.forEach((bId) => {
        if (!this.players.has(bId)) {
          this.players.set(bId, {
            userId: bId,
            playerId: '',
            name: 'Unknown (Banned)',
            lastIp: '',
            lastPing: 0,
            location_x: 0,
            location_y: 0,
            level: 0,
            firstSeen: Date.now(),
            lastSeen: Date.now(),
            playTimeSeconds: 0,
            status: 'banned',
            reason: '-'
          })
          changed = true
        }
      })

      if (changed) {
        this.save()
      }
    } catch (err: unknown) {
      console.error(`Failed to sync banlist ${this.banlistPath}:`, err)
    }
  }

  public updateActivePlayers(activePlayers: PlayerInfo[]): void {
    this.syncBanlist()

    const now = Date.now()
    const activeIds = new Set<string>()
    let changed = false

    for (const ap of activePlayers) {
      activeIds.add(ap.userId)
      const existing = this.players.get(ap.userId)

      if (existing) {
        if (existing.status === 'online') {
          const diff = Math.floor((now - existing.lastSeen) / 1000)
          if (diff > 0 && diff < 300) {
            existing.playTimeSeconds += diff
          }
        }

        existing.playerId = ap.playerId || existing.playerId
        existing.name = ap.name || existing.name
        existing.lastIp = ap.ip || existing.lastIp
        existing.lastPing = ap.ping
        existing.location_x = ap.location_x
        existing.location_y = ap.location_y
        existing.level = ap.level
        existing.lastSeen = now
        if (existing.status !== 'banned') {
          existing.status = 'online'
        }
        changed = true
      } else {
        this.players.set(ap.userId, {
          userId: ap.userId,
          playerId: ap.playerId,
          name: ap.name || 'Unknown',
          lastIp: ap.ip || '',
          lastPing: ap.ping || 0,
          location_x: ap.location_x || 0,
          location_y: ap.location_y || 0,
          level: ap.level || 1,
          firstSeen: now,
          lastSeen: now,
          playTimeSeconds: 0,
          status: 'online'
        })
        changed = true
      }
    }

    this.players.forEach((p) => {
      if (p.status === 'online' && !activeIds.has(p.userId)) {
        p.status = 'offline'
        changed = true
      }
    })

    if (changed) {
      this.save()
    }
  }

  public getAll(): PersistedPlayer[] {
    this.syncBanlist()
    return Array.from(this.players.values())
  }

  public setPlayerStatus(userId: string, status: 'online' | 'offline' | 'banned'): void {
    const p = this.players.get(userId)
    if (p) {
      p.status = status
      this.save()
    }
  }

  public markAllOffline(): void {
    let changed = false
    this.players.forEach((p) => {
      if (p.status === 'online') {
        p.status = 'offline'
        changed = true
      }
    })
    if (changed) {
      this.save()
    }
  }
}
