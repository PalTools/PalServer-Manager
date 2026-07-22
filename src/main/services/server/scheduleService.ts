import {
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  mkdirSync,
  promises as fsPromises
} from 'fs'
import { join, relative, dirname } from 'path'
import { randomUUID } from 'crypto'
import * as zlib from 'zlib'
import { ServerInstance } from './instance'
import { Schedule, ScheduleTask, ScheduleHistory } from '../core/types'

function crc32(buf: Buffer): number {
  let crc = -1
  for (let i = 0; i < buf.length; i++) {
    let byte = buf[i]
    for (let j = 0; j < 8; j++) {
      const bit = (byte ^ crc) & 1
      crc = (crc >>> 1) ^ (bit ? 0xedb88320 : 0)
      byte >>>= 1
    }
  }
  return (crc ^ -1) >>> 0
}

async function createPureZipArchive(
  sourceDir: string,
  destZipPath: string,
  excludeNames: string[] = ['backup', 'backups']
): Promise<void> {
  const entries: {
    relativePath: string
    compressed: Buffer
    crc: number
    uncompressedSize: number
    compressedSize: number
    offset: number
    modTime: number
    modDate: number
  }[] = []

  async function walk(currentDir: string): Promise<void> {
    const files = await fsPromises.readdir(currentDir, { withFileTypes: true })
    for (const file of files) {
      const nameLower = file.name.toLowerCase()
      if (
        excludeNames.includes(nameLower) ||
        nameLower.startsWith('banlist') ||
        nameLower.endsWith('.txt') ||
        nameLower.endsWith('.log')
      ) {
        continue
      }

      const fullPath = join(currentDir, file.name)
      if (file.isDirectory()) {
        await walk(fullPath)
      } else if (file.isFile()) {
        let relPath = relative(sourceDir, fullPath).replace(/\\/g, '/')
        if (relPath.startsWith('/')) relPath = relPath.substring(1)

        const content = await fsPromises.readFile(fullPath)
        const compressed = zlib.deflateRawSync(content)
        const crcVal = crc32(content)

        const stat = await fsPromises.stat(fullPath)
        const d = new Date(stat.mtimeMs)
        const modTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)
        const modDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()

        entries.push({
          relativePath: relPath,
          compressed,
          crc: crcVal,
          uncompressedSize: content.length,
          compressedSize: compressed.length,
          offset: 0,
          modTime,
          modDate
        })
      }
    }
  }

  await walk(sourceDir)

  const parts: Buffer[] = []
  let currentOffset = 0

  for (const entry of entries) {
    entry.offset = currentOffset
    const pathBuf = Buffer.from(entry.relativePath, 'utf8')
    const header = Buffer.alloc(30 + pathBuf.length)

    header.writeUInt32LE(0x04034b50, 0)
    header.writeUInt16LE(20, 4)
    header.writeUInt16LE(0, 6)
    header.writeUInt16LE(8, 8)
    header.writeUInt16LE(entry.modTime, 10)
    header.writeUInt16LE(entry.modDate, 12)
    header.writeUInt32LE(entry.crc, 14)
    header.writeUInt32LE(entry.compressedSize, 18)
    header.writeUInt32LE(entry.uncompressedSize, 22)
    header.writeUInt16LE(pathBuf.length, 26)
    header.writeUInt16LE(0, 28)
    pathBuf.copy(header, 30)

    parts.push(header)
    parts.push(entry.compressed)
    currentOffset += header.length + entry.compressed.length
  }

  const cdStartOffset = currentOffset
  let cdSize = 0

  for (const entry of entries) {
    const pathBuf = Buffer.from(entry.relativePath, 'utf8')
    const cdHeader = Buffer.alloc(46 + pathBuf.length)

    cdHeader.writeUInt32LE(0x02014b50, 0)
    cdHeader.writeUInt16LE(20, 4)
    cdHeader.writeUInt16LE(20, 6)
    cdHeader.writeUInt16LE(0, 8)
    cdHeader.writeUInt16LE(8, 10)
    cdHeader.writeUInt16LE(entry.modTime, 12)
    cdHeader.writeUInt16LE(entry.modDate, 14)
    cdHeader.writeUInt32LE(entry.crc, 16)
    cdHeader.writeUInt32LE(entry.compressedSize, 20)
    cdHeader.writeUInt32LE(entry.uncompressedSize, 24)
    cdHeader.writeUInt16LE(pathBuf.length, 28)
    cdHeader.writeUInt16LE(0, 30)
    cdHeader.writeUInt16LE(0, 32)
    cdHeader.writeUInt16LE(0, 34)
    cdHeader.writeUInt16LE(0, 36)
    cdHeader.writeUInt32LE(0, 38)
    cdHeader.writeUInt32LE(entry.offset, 42)
    pathBuf.copy(cdHeader, 46)

    parts.push(cdHeader)
    cdSize += cdHeader.length
  }

  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(cdSize, 12)
  eocd.writeUInt32LE(cdStartOffset, 16)
  eocd.writeUInt16LE(0, 20)

  parts.push(eocd)

  await fsPromises.mkdir(dirname(destZipPath), { recursive: true })
  await fsPromises.writeFile(destZipPath, Buffer.concat(parts))
}

function parseCronPart(part: string, currentVal: number): boolean {
  if (part === '*') return true

  if (part.startsWith('*/')) {
    const step = parseInt(part.substring(2), 10)
    return !isNaN(step) && step > 0 && currentVal % step === 0
  }

  if (part.includes(',')) {
    const subParts = part.split(',').map((p) => parseInt(p.trim(), 10))
    return subParts.includes(currentVal)
  }

  if (part.includes('-')) {
    const [startStr, endStr] = part.split('-')
    const start = parseInt(startStr, 10)
    const end = parseInt(endStr, 10)
    return !isNaN(start) && !isNaN(end) && currentVal >= start && currentVal <= end
  }

  const val = parseInt(part, 10)
  return !isNaN(val) && val === currentVal
}

export function matchesCron(cron: string, date: Date = new Date()): boolean {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return false

  const [minPart, hourPart, domPart, monthPart, dowPart] = parts

  const min = date.getMinutes()
  const hour = date.getHours()
  const dom = date.getDate()
  const month = date.getMonth() + 1
  const dow = date.getDay()

  return (
    parseCronPart(minPart, min) &&
    parseCronPart(hourPart, hour) &&
    parseCronPart(domPart, dom) &&
    parseCronPart(monthPart, month) &&
    parseCronPart(dowPart, dow)
  )
}

export function getNextCronRun(cron: string, fromDate: Date = new Date()): Date {
  const next = new Date(fromDate.getTime())
  next.setSeconds(0, 0)
  next.setMinutes(next.getMinutes() + 1)

  for (let i = 0; i < 525600; i++) {
    if (matchesCron(cron, next)) {
      return next
    }
    next.setMinutes(next.getMinutes() + 1)
  }
  return next
}

export function calculateNextRunTimes(cron: string, count = 3): string[] {
  const results: string[] = []
  let curr = new Date()
  for (let i = 0; i < count; i++) {
    curr = getNextCronRun(cron, curr)
    results.push(curr.toISOString())
  }
  return results
}

export function translateCronToText(cron: string): string {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return 'Custom Schedule'

  const [m, h, , , dow] = parts

  if (cron === '*/30 * * * *') return 'Every 30 minutes'
  if (cron === '0 * * * *') return 'Every hour at minute 0'
  if (cron === '0 */2 * * *') return 'Every 2 hours'
  if (cron === '0 */6 * * *') return 'Every 6 hours'
  if (cron === '0 0 * * *') return 'Every day at Midnight (00:00)'
  if (cron === '0 4 * * *') return 'Every day at 04:00 AM'
  if (cron === '0 0 * * 0') return 'Every Sunday at Midnight'

  let text = ''
  if (m.startsWith('*/')) {
    text += `Every ${m.substring(2)} minutes`
  } else if (m === '0' && h.startsWith('*/')) {
    text += `Every ${h.substring(2)} hours`
  } else if (m !== '*' && h !== '*') {
    const padH = h.padStart(2, '0')
    const padM = m.padStart(2, '0')
    text += `Daily at ${padH}:${padM}`
  } else {
    text += `Cron (${cron})`
  }

  if (dow !== '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dowNum = parseInt(dow, 10)
    if (!isNaN(dowNum) && days[dowNum]) {
      text += ` on ${days[dowNum]}`
    }
  }

  return text
}

export class ScheduleService {
  private _evaluatorInterval?: NodeJS.Timeout

  startEvaluator(getInstances: () => ServerInstance[]): void {
    if (this._evaluatorInterval) return

    let lastEvaluatedMinute = -1

    this._evaluatorInterval = setInterval(async () => {
      const now = new Date()
      const currentMinute = now.getMinutes()
      if (currentMinute === lastEvaluatedMinute) return
      lastEvaluatedMinute = currentMinute

      const instances = getInstances()
      for (const instance of instances) {
        try {
          const schedules = this.listSchedules(instance)
          for (const schedule of schedules) {
            if (!schedule.isActive) continue
            if (schedule.onlyWhenOnline && !instance.isRunning()) continue

            if (matchesCron(schedule.cronExpression, now)) {
              this.executeSchedulePipeline(instance, schedule, 'scheduled').catch(console.error)
            }
          }
        } catch (err) {
          console.error(`Schedule evaluator error for ${instance.id}:`, err)
        }
      }
    }, 10000)
  }

  stopEvaluator(): void {
    if (this._evaluatorInterval) {
      clearInterval(this._evaluatorInterval)
      this._evaluatorInterval = undefined
    }
  }

  getSchedulesFilePath(instance: ServerInstance): string {
    return join(instance.installPath, 'schedules.json')
  }

  listSchedules(instance: ServerInstance): Schedule[] {
    const filePath = this.getSchedulesFilePath(instance)
    if (!existsSync(filePath)) return []

    try {
      const raw = readFileSync(filePath, 'utf-8')
      const parsed: Schedule[] = JSON.parse(raw)
      return parsed.map((s) => ({
        ...s,
        nextRunAt: s.isActive ? getNextCronRun(s.cronExpression).toISOString() : undefined
      }))
    } catch (e) {
      console.error(`Failed to read schedules from ${filePath}:`, e)
      return []
    }
  }

  saveSchedules(instance: ServerInstance, schedules: Schedule[]): void {
    const filePath = this.getSchedulesFilePath(instance)
    const tempPath = `${filePath}.tmp`

    try {
      mkdirSync(instance.installPath, { recursive: true })
      writeFileSync(tempPath, JSON.stringify(schedules, null, 2), 'utf-8')
      renameSync(tempPath, filePath)
    } catch (e) {
      console.error(`Atomic save failed for ${filePath}:`, e)
      try {
        writeFileSync(filePath, JSON.stringify(schedules, null, 2), 'utf-8')
      } catch (err) {
        console.error(`Fallback save failed for ${filePath}:`, err)
      }
    }
  }

  saveSchedule(instance: ServerInstance, input: Partial<Schedule>): Schedule {
    const schedules = this.listSchedules(instance)
    const now = new Date()

    let schedule: Schedule

    if (input.id) {
      const idx = schedules.findIndex((s) => s.id === input.id)
      if (idx !== -1) {
        schedule = {
          ...schedules[idx],
          ...input,
          tasks: input.tasks ?? schedules[idx].tasks ?? []
        }
        schedules[idx] = schedule
      } else {
        schedule = {
          id: input.id,
          name: input.name || 'Untitled Schedule',
          cronExpression: input.cronExpression || '0 0 * * *',
          isActive: input.isActive ?? true,
          onlyWhenOnline: input.onlyWhenOnline ?? false,
          tasks: input.tasks ?? [],
          history: []
        }
        schedules.push(schedule)
      }
    } else {
      schedule = {
        id: randomUUID(),
        name: input.name || 'New Schedule',
        cronExpression: input.cronExpression || '0 0 * * *',
        isActive: input.isActive ?? true,
        onlyWhenOnline: input.onlyWhenOnline ?? false,
        tasks: input.tasks ?? [],
        history: []
      }
      schedules.push(schedule)
    }

    schedule.nextRunAt = schedule.isActive
      ? getNextCronRun(schedule.cronExpression, now).toISOString()
      : undefined

    this.saveSchedules(instance, schedules)
    return schedule
  }

  deleteSchedule(instance: ServerInstance, scheduleId: string): void {
    const schedules = this.listSchedules(instance)
    const filtered = schedules.filter((s) => s.id !== scheduleId)
    this.saveSchedules(instance, filtered)
  }

  async runScheduleNow(instance: ServerInstance, scheduleId: string): Promise<ScheduleHistory> {
    const schedules = this.listSchedules(instance)
    const schedule = schedules.find((s) => s.id === scheduleId)
    if (!schedule) throw new Error('Schedule not found')

    return await this.executeSchedulePipeline(instance, schedule, 'manual')
  }

  async executeSchedulePipeline(
    instance: ServerInstance,
    schedule: Schedule,
    triggerType: 'scheduled' | 'manual'
  ): Promise<ScheduleHistory> {
    const logs: string[] = []
    const startTimestamp = new Date().toISOString()

    const addLog = (msg: string): void => {
      const line = `[${new Date().toLocaleTimeString()}] ${msg}`
      logs.push(line)
    }

    addLog(`Starting pipeline execution for schedule "${schedule.name}" (${triggerType})`)

    let overallSuccess = true
    let hasFailure = false

    for (let i = 0; i < schedule.tasks.length; i++) {
      const task = schedule.tasks[i]
      const stepName = `Step ${i + 1}/${schedule.tasks.length}`

      if (task.delaySeconds > 0) {
        addLog(`${stepName}: Waiting delay timer of ${task.delaySeconds}s...`)
        await sleep(task.delaySeconds * 1000)
      }

      addLog(`${stepName}: Executing action "${task.action}" (payload: "${task.payload}")`)

      try {
        await this.executeTaskAction(instance, task, addLog)
        addLog(`${stepName}: Completed successfully.`)
      } catch (err) {
        hasFailure = true
        const errMsg = err instanceof Error ? err.message : String(err)
        addLog(`${stepName} Failed: ${errMsg}`)

        if (!task.continueOnFailure) {
          addLog(`Pipeline terminated early due to step failure.`)
          overallSuccess = false
          break
        }
      }
    }

    const historyRecord: ScheduleHistory = {
      id: randomUUID(),
      timestamp: startTimestamp,
      triggerType,
      status: overallSuccess && !hasFailure ? 'success' : hasFailure ? 'partial' : 'failed',
      logs
    }

    const schedules = this.listSchedules(instance)
    const target = schedules.find((s) => s.id === schedule.id)
    if (target) {
      target.lastRunAt = startTimestamp
      target.nextRunAt = target.isActive
        ? getNextCronRun(target.cronExpression).toISOString()
        : undefined

      if (!target.history) target.history = []
      target.history.unshift(historyRecord)
      if (target.history.length > 10) {
        target.history = target.history.slice(0, 10)
      }

      this.saveSchedules(instance, schedules)
    }

    return historyRecord
  }

  private async executeTaskAction(
    instance: ServerInstance,
    task: ScheduleTask,
    log: (msg: string) => void
  ): Promise<void> {
    switch (task.action) {
      case 'send_command': {
        const cmd = task.payload.trim()
        if (!cmd) throw new Error('Empty RCON command payload')

        if (cmd.toLowerCase().startsWith('broadcast ')) {
          const msg = cmd.substring(10)
          await instance.sendAnnouncement(msg)
        } else {
          await instance.sendRconCommand(cmd)
        }
        break
      }
      case 'power_action': {
        const action = task.payload.trim().toLowerCase()
        if (action === 'start') {
          await instance.start(log)
        } else if (action === 'stop') {
          await instance.stop(log)
        } else if (action === 'restart') {
          log('Restarting server...')
          await instance.stop(log)
          await sleep(2000)
          await instance.start(log)
        } else if (action === 'kill') {
          await instance.kill(log)
        } else {
          throw new Error(`Unknown power action: ${task.payload}`)
        }
        break
      }
      case 'backup': {
        log('Creating save games backup archive...')
        await this.createBackupArchive(instance, log)
        break
      }
      default:
        throw new Error(`Unsupported task action: ${(task as ScheduleTask).action}`)
    }
  }

  private async createBackupArchive(
    instance: ServerInstance,
    log: (msg: string) => void
  ): Promise<void> {
    const backupDir = join(instance.installPath, 'Backups')
    mkdirSync(backupDir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const saveGamesDir = join(instance.installPath, 'Pal', 'Saved', 'SaveGames')

    if (!existsSync(saveGamesDir)) {
      throw new Error(`Save directory not found at ${saveGamesDir}`)
    }

    const zipPath = join(backupDir, `Backup_${timestamp}.zip`)
    log(`Creating cross-platform zip archive: ${zipPath}`)
    await createPureZipArchive(saveGamesDir, zipPath, ['backup', 'backups'])
    log(`Backup archive created successfully: ${zipPath}`)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
