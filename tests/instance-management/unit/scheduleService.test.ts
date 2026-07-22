import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import {
  ScheduleService,
  matchesCron,
  translateCronToText,
  calculateNextRunTimes
} from '../../../src/main/services/server/scheduleService'
import { ServerInstance } from '../../../src/main/services/server/instance'
import { Schedule } from '../../../src/main/services/core/types'

describe('ScheduleService Unit Tests', () => {
  let tempDir: string
  let service: ScheduleService
  let mockInstance: ServerInstance

  beforeEach(() => {
    tempDir = join(tmpdir(), `palserver-test-schedules-${randomUUID()}`)
    mkdirSync(tempDir, { recursive: true })

    service = new ScheduleService()

    mockInstance = {
      id: 'test-instance-1',
      name: 'Test Palworld Instance',
      installPath: tempDir,
      isRunning: () => true,
      sendAnnouncement: vi.fn().mockResolvedValue(undefined),
      sendRconCommand: vi.fn().mockResolvedValue('OK'),
      start: vi.fn().mockImplementation((log) => {
        log('Starting mock instance')
        return Promise.resolve()
      }),
      stop: vi.fn().mockImplementation((log) => {
        log('Stopping mock instance')
        return Promise.resolve()
      }),
      kill: vi.fn().mockImplementation((log) => {
        log('Killing mock instance')
        return Promise.resolve()
      })
    } as unknown as ServerInstance
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('correctly matches standard cron expressions', () => {
    const testDate = new Date(2026, 6, 22, 4, 0, 0)
    expect(matchesCron('0 4 * * *', testDate)).toBe(true)
    expect(matchesCron('0 5 * * *', testDate)).toBe(false)
    expect(matchesCron('*/30 * * * *', testDate)).toBe(true)
  })

  it('translates cron expressions to human-readable text', () => {
    expect(translateCronToText('*/30 * * * *')).toBe('Every 30 minutes')
    expect(translateCronToText('0 4 * * *')).toBe('Every day at 04:00 AM')
    expect(translateCronToText('0 0 * * 0')).toBe('Every Sunday at Midnight')
  })

  it('calculates future next run timestamps', () => {
    const runs = calculateNextRunTimes('0 4 * * *', 2)
    expect(runs.length).toBe(2)
    expect(new Date(runs[0]).getTime()).toBeGreaterThan(Date.now())
  })

  it('creates and persists new schedule via saveSchedule', () => {
    const newSchedule = service.saveSchedule(mockInstance, {
      name: 'Nightly Backup & Restart',
      cronExpression: '0 4 * * *',
      isActive: true,
      tasks: [
        {
          id: '1',
          action: 'send_command',
          payload: 'broadcast Server restarting in 5 minutes',
          delaySeconds: 0,
          continueOnFailure: true
        }
      ]
    })

    expect(newSchedule.id).toBeDefined()
    expect(newSchedule.name).toBe('Nightly Backup & Restart')

    const list = service.listSchedules(mockInstance)
    expect(list.length).toBe(1)
    expect(list[0].name).toBe('Nightly Backup & Restart')
  })

  it('updates an existing schedule', () => {
    const created = service.saveSchedule(mockInstance, {
      name: 'Original Name',
      cronExpression: '0 0 * * *',
      isActive: true
    })

    const updated = service.saveSchedule(mockInstance, {
      id: created.id,
      name: 'Updated Name',
      cronExpression: '0 12 * * *'
    })

    expect(updated.name).toBe('Updated Name')
    expect(updated.cronExpression).toBe('0 12 * * *')

    const list = service.listSchedules(mockInstance)
    expect(list.length).toBe(1)
    expect(list[0].name).toBe('Updated Name')
  })

  it('deletes a schedule correctly', () => {
    const created = service.saveSchedule(mockInstance, {
      name: 'Schedule To Delete',
      cronExpression: '0 0 * * *'
    })

    expect(service.listSchedules(mockInstance).length).toBe(1)

    service.deleteSchedule(mockInstance, created.id)
    expect(service.listSchedules(mockInstance).length).toBe(0)
  })

  it('executes task pipeline sequentially and records history', async () => {
    const saveGamesDir = join(tempDir, 'Pal', 'Saved', 'SaveGames', '0', 'WORLDGUID')
    mkdirSync(saveGamesDir, { recursive: true })
    writeFileSync(join(saveGamesDir, 'Level.sav'), 'dummy save content')
    writeFileSync(join(saveGamesDir, 'banlist.txt'), 'banned_user_1')

    const backupSubfolder = join(saveGamesDir, 'backup')
    mkdirSync(backupSubfolder, { recursive: true })
    writeFileSync(join(backupSubfolder, 'old_save.sav'), 'old backup')

    const schedule: Schedule = {
      id: 'test-sched-1',
      name: 'Full Maintenance',
      cronExpression: '0 0 * * *',
      isActive: true,
      onlyWhenOnline: true,
      tasks: [
        {
          id: 'step-1',
          action: 'send_command',
          payload: 'broadcast Server maintenance starting',
          delaySeconds: 0,
          continueOnFailure: true
        },
        {
          id: 'step-2',
          action: 'backup',
          payload: '',
          delaySeconds: 0,
          continueOnFailure: true
        },
        {
          id: 'step-3',
          action: 'power_action',
          payload: 'restart',
          delaySeconds: 0,
          continueOnFailure: true
        }
      ],
      history: []
    }

    service.saveSchedules(mockInstance, [schedule])

    const history = await service.runScheduleNow(mockInstance, schedule.id)

    expect(history.status).toBe('success')
    expect(history.logs.length).toBeGreaterThan(0)
    expect(mockInstance.sendAnnouncement).toHaveBeenCalledWith('Server maintenance starting')
    expect(mockInstance.stop).toHaveBeenCalled()
    expect(mockInstance.start).toHaveBeenCalled()

    const backupDir = join(tempDir, 'Backups')
    expect(existsSync(backupDir)).toBe(true)
    const backupFiles = readdirSync(backupDir).filter((f) => f.endsWith('.zip'))
    expect(backupFiles.length).toBe(1)
  })
})
