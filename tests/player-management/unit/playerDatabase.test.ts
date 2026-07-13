import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PlayerDatabase } from '../../../src/main/services/server/playerDatabase'
import { existsSync, rmSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

describe('player-management - unit & integration', () => {
  let tempRoot: string
  let db: PlayerDatabase

  beforeEach(() => {
    tempRoot = join(tmpdir(), 'palserver-manager-tests-players', randomUUID())
    mkdirSync(tempRoot, { recursive: true })
    db = new PlayerDatabase(tempRoot)
  })

  afterEach(async () => {
    if (db) {
      await (db as unknown as { saveQueue: Promise<void> }).saveQueue
    }
    if (existsSync(tempRoot)) {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  it('unit: merge/update logic for historical records', () => {
    db.updateActivePlayers([
      {
        userId: '123',
        playerId: 'pid1',
        name: 'Player1',
        ip: '1.1.1.1',
        ping: 10,
        location_x: 0,
        location_y: 0,
        level: 1
      }
    ])

    let all = db.getAll()
    expect(all.length).toBe(1)
    expect(all[0].status).toBe('online')

    // Simulate disconnect
    db.updateActivePlayers([])
    all = db.getAll()
    expect(all[0].status).toBe('offline')

    // Reconnect with new IP
    db.updateActivePlayers([
      {
        userId: '123',
        playerId: 'pid1',
        name: 'Player1_New',
        ip: '2.2.2.2',
        ping: 15,
        location_x: 0,
        location_y: 0,
        level: 2
      }
    ])
    all = db.getAll()
    expect(all[0].name).toBe('Player1_New')
    expect(all[0].lastIp).toBe('2.2.2.2')
    expect(all[0].status).toBe('online')
  })

  it('integration: ban/unban marks player status', () => {
    db.updateActivePlayers([
      {
        userId: '456',
        playerId: 'pid2',
        name: 'Hacker',
        ip: '1.1.1.1',
        ping: 10,
        location_x: 0,
        location_y: 0,
        level: 1
      }
    ])

    db.setPlayerStatus('456', 'banned')
    expect(db.getAll()[0].status).toBe('banned')

    db.setPlayerStatus('456', 'offline')
    expect(db.getAll()[0].status).toBe('offline')
  })
})
