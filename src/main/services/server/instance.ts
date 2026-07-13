/**
 * backend/instance.ts — ServerInstance class.
 *
 * Each ServerInstance owns its own config, ports, child process handle, and
 * REST API credentials. No module-level mutable state.
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  openSync,
  statSync,
  createReadStream,
  readdirSync
} from 'fs'
import { join } from 'path'
import { spawn, ChildProcess } from 'child_process'
import { randomUUID } from 'crypto'
import { GameRCON } from './rconClient'

import {
  InstanceConfig,
  InstanceStatus,
  InstallProgress,
  InstanceInfo,
  CreateInstanceInput,
  InstanceMetrics,
  InstanceSettings,
  SERVER_EXE_NAME,
  isLinux
} from '../core/types'
import { PALWORLD_SCHEMA, smartFixSetting } from './palworldSchema'
import { installOrUpdate, checkForUpdate } from '../engine/steamcmd'
import {
  isProcessAlive,
  killProcessTree,
  verifyPid,
  findProcessIdByPath
} from '../system/processControl'
import { getDedicatedName, setSettingValues, getAllSettings } from './iniConfig'
import { PalworldApi } from './palworldApi'
import { PlayerDatabase } from './playerDatabase'

export class ServerInstance {
  readonly id: string
  name: string
  readonly createdAt: string
  readonly installPath: string
  settings: InstanceSettings
  limits: Record<string, unknown>
  PalworldSettings: Record<string, string | number | boolean>
  state: InstanceConfig['state']
  info?: InstanceInfo
  pid?: number

  // Runtime (not persisted)
  private _childProcess: ChildProcess | null = null
  private _startTime: number | null = null
  private _lastRestartTime: number | null = null
  private _manualStop = false
  private _stopInProgress = false
  private _log: ((msg: string) => void) | null = null
  private _onStatusUpdate: ((status: InstanceStatus) => void) | null = null
  private _installProgress?: InstallProgress
  private _tailInterval?: NodeJS.Timeout

  private _lastStatusEmit = 0
  private _emitTimeout: NodeJS.Timeout | null = null

  public readonly playerDb: PlayerDatabase

  constructor(config: InstanceConfig) {
    this.id = config.id
    this.name = config.name
    this.createdAt = config.createdAt
    this.installPath = config.installPath
    this.settings = { ...config.settings }
    this.limits = { ...config.limits }
    this.PalworldSettings = config.PalworldSettings ? { ...config.PalworldSettings } : {}
    this.state = config.state
    this.info = config.info
    this.pid = config.pid

    this.playerDb = new PlayerDatabase(this.installPath)
  }

  /** Create a new ServerInstance with defaults. */
  static create(
    input: CreateInstanceInput,
    installPath: string,
    queryPort: number,
    id?: string
  ): ServerInstance {
    const config: InstanceConfig = {
      id: id || randomUUID(),
      name: input.name,
      createdAt: new Date().toISOString(),
      installPath,
      settings: {
        publicLobby: input.settings?.publicLobby ?? true,
        queryPort,
        restApiUsername: 'admin'
      },
      limits: {},
      PalworldSettings: {},
      state: 'stopped'
    }

    // Populate default game settings from schema
    for (const schema of PALWORLD_SCHEMA) {
      if (!schema.hideInUI) {
        config.PalworldSettings[schema.key] = schema.defaultValue
      }
    }

    // Merge user-provided game settings
    if (input.PalworldSettings) {
      for (const [key, value] of Object.entries(input.PalworldSettings)) {
        config.PalworldSettings[key] = value
      }
    }

    // Merge additional settings
    if (input.settings) {
      config.settings = { ...config.settings, ...input.settings }
    }

    return new ServerInstance(config)
  }

  /** Load an instance from its instance.json file. */
  static load(instanceJsonPath: string): ServerInstance | null {
    try {
      const raw = readFileSync(instanceJsonPath, 'utf-8')
      const config: InstanceConfig = JSON.parse(raw)

      // Ensure all default game settings are present
      if (!config.PalworldSettings) config.PalworldSettings = {}

      let changed = false

      // Migrate legacy 'ports' config
      const anyConfig = config as unknown as Record<string, unknown>
      if (anyConfig.ports) {
        if (!config.settings) config.settings = {} as InstanceSettings
        if (config.settings.queryPort === undefined) {
          config.settings.queryPort =
            (anyConfig.ports as Record<string, number>)?.queryPort || 27015
        }
        if (config.PalworldSettings.PublicPort === undefined) {
          config.PalworldSettings.PublicPort =
            (anyConfig.ports as Record<string, number>)?.publicPort || 8211
        }
        delete anyConfig.ports
        changed = true
      }

      // Migrate legacy 'gameSettings' config
      if (anyConfig.gameSettings) {
        config.PalworldSettings = {
          ...(anyConfig.gameSettings as Record<string, string>),
          ...config.PalworldSettings
        }
        delete anyConfig.gameSettings
        changed = true
      }

      for (const schema of PALWORLD_SCHEMA) {
        if (!schema.hideInUI && config.PalworldSettings[schema.key] === undefined) {
          config.PalworldSettings[schema.key] = schema.defaultValue
          changed = true
        }
      }

      const instance = new ServerInstance(config)

      if (changed) {
        instance.saveConfig()
      }

      return instance
    } catch (e) {
      console.error(`Failed to load instance from ${instanceJsonPath}:`, e)
      return null
    }
  }

  // ── Paths ──────────────────────────────────────────────────────

  get serverDir(): string {
    return this.installPath
  }

  get targetDir(): string {
    return join(this.serverDir, 'Pal', 'Binaries', isLinux ? 'Linux' : 'Win64')
  }

  get targetExe(): string {
    return join(this.targetDir, SERVER_EXE_NAME)
  }

  get savedDir(): string {
    return join(this.serverDir, 'Pal', 'Saved')
  }

  get settingsFile(): string {
    return join(
      this.savedDir,
      'Config',
      isLinux ? 'LinuxServer' : 'WindowsServer',
      'PalWorldSettings.ini'
    )
  }

  get gameUserSettingsFile(): string {
    return join(
      this.savedDir,
      'Config',
      isLinux ? 'LinuxServer' : 'WindowsServer',
      'GameUserSettings.ini'
    )
  }

  get instanceJsonPath(): string {
    return join(this.installPath, 'instance.json')
  }

  // ── Persistence ────────────────────────────────────────────────

  saveConfig(): void {
    try {
      mkdirSync(this.installPath, { recursive: true })
      writeFileSync(this.instanceJsonPath, JSON.stringify(this.toConfig(), null, 2), 'utf-8')
      // Only sync INI when the server is actually installed (config dir exists)
      if (existsSync(this.targetExe)) {
        this.syncIniSettings()
      }
    } catch (e) {
      this._log?.(`Failed to save instance config: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  private getOrderedPalworldSettings(): Record<string, string | number | boolean> {
    const ordered: Record<string, string | number | boolean> = {}
    // Enforce sequence from schema
    for (const schema of PALWORLD_SCHEMA) {
      if (this.PalworldSettings[schema.key] !== undefined) {
        ordered[schema.key] = this.PalworldSettings[schema.key]
      }
    }
    // Include any custom keys not in schema
    for (const [k, v] of Object.entries(this.PalworldSettings)) {
      if (ordered[k] === undefined) ordered[k] = v
    }
    return ordered
  }

  toConfig(): InstanceConfig {
    return {
      id: this.id,
      name: this.name,
      createdAt: this.createdAt,
      installPath: this.installPath,
      settings: { ...this.settings },
      limits: { ...this.limits },
      PalworldSettings: this.getOrderedPalworldSettings(),
      state: this.state,
      pid: this.pid
    }
  }

  toStatus(): InstanceStatus {
    return {
      id: this.id,
      name: this.name,
      state: this.state,
      installProgress: this._installProgress,
      uptime: 'N/A',
      memory: 'N/A',
      players: '0',
      maxPlayers: '32',
      fps: 'N/A',
      frametime: 'N/A',
      baseCamps: '0',
      days: '0',
      serverName: this.info?.serverName || 'Offline',
      description: this.info?.description || '',
      worldGuid: this.info?.worldGuid || '',
      restartIn: 'N/A',
      version: this.info?.version || 'Unknown',
      lastStarted: this.lastRestartTime
        ? new Date(this.lastRestartTime * 1000).toLocaleString()
        : undefined,
      saveSize: this.calculateSaveSize()
    }
  }

  calculateSaveSize(): string {
    try {
      let targetDir = this.savedDir
      if (this.info?.worldGuid) {
        // Look inside Pal/Saved/SaveGames/0/<GUID>
        const specificWorldDir = join(
          this.savedDir,
          'SaveGames',
          '0',
          this.info.worldGuid.toUpperCase()
        )
        if (existsSync(specificWorldDir)) {
          targetDir = specificWorldDir
        }
      }

      if (!existsSync(targetDir)) return '0 MB'
      let totalSize = 0
      const getDirSize = (dir: string): void => {
        const files = readdirSync(dir)
        for (const file of files) {
          // Skip backup folders so they don't inflate the save size
          if (file.toLowerCase() === 'backup' || file.toLowerCase() === 'backups') continue

          const filePath = join(dir, file)
          const stats = statSync(filePath)
          if (stats.isDirectory()) {
            getDirSize(filePath)
          } else {
            totalSize += stats.size
          }
        }
      }
      getDirSize(this.savedDir)
      if (totalSize === 0) return '0 MB'
      return (totalSize / (1024 * 1024)).toFixed(2) + ' MB'
    } catch {
      return 'Unknown'
    }
  }

  // ── SteamCMD operations ────────────────────────────────────────

  async install(log?: (msg: string) => void): Promise<void> {
    this.state = 'installing'
    this.saveConfig()
    this.emitStatus()

    await installOrUpdate(this.serverDir, log, (stage, percentage) => {
      this._installProgress = { stage, percentage }
      this.emitStatus()
    })

    this._installProgress = undefined
    this.state = 'stopped'
    this.saveConfig()
    this.emitStatus()
  }

  async updateIfNeeded(log?: (msg: string) => void): Promise<boolean> {
    const result = await checkForUpdate(this.serverDir, log)
    if (result.needsUpdate) {
      log?.('Update detected — installing...')
      await installOrUpdate(this.serverDir, log)
      return true
    }
    log?.('No update detected.')
    return false
  }

  // ── Process lifecycle ──────────────────────────────────────────

  setLogFn(fn: (msg: string) => void): void {
    this._log = fn
  }

  setOnStatusUpdate(fn: (status: InstanceStatus) => void): void {
    this._onStatusUpdate = fn
  }

  get manualStop(): boolean {
    return this._manualStop
  }

  set manualStop(val: boolean) {
    this._manualStop = val
  }

  get startTime(): number | null {
    return this._startTime
  }

  get lastRestartTime(): number | null {
    return this._lastRestartTime
  }

  resetTimers(): void {
    const now = Date.now() / 1000
    this._startTime = now
    this._lastRestartTime = now
  }

  async start(log?: (msg: string) => void): Promise<void> {
    const logFn = log || this._log || (() => {})
    this._manualStop = false

    // Kill any existing process for this instance
    if (this.isRunning()) {
      await killProcessTree(this.pid)
      await sleep(1000)
    }

    // Ensure installed
    if (!existsSync(this.targetExe)) {
      throw new Error(
        'Server executable not found. The instance might be corrupted or missing files.'
      )
    }

    this.state = 'starting'
    this.saveConfig()
    this.emitStatus()

    logFn('Patching PalWorldSettings.ini with current configuration...')
    try {
      this.syncIniSettings()
    } catch (e) {
      logFn(`Failed to patch INI: ${e instanceof Error ? e.message : String(e)}`)
    }

    logFn(`Starting server on port ${this.PalworldSettings.PublicPort || 8211}...`)
    const args = [
      '-log',
      `-port=${this.PalworldSettings.PublicPort || 8211}`,
      `-publicport=${this.PalworldSettings.PublicPort || 8211}`,
      '-useperfthreads',
      '-NoAsyncLoadingThread',
      '-UseMultithreadForDS',
      `-QueryPort=${this.settings.queryPort}`,
      '-ForceLogFlush'
    ]

    if (this.PalworldSettings.PublicIP && String(this.PalworldSettings.PublicIP).trim() !== '') {
      args.push(`-publicip=${this.PalworldSettings.PublicIP}`)
    }

    if (this.PalworldSettings.RCONEnabled && this.PalworldSettings.RCONPort) {
      args.push(`-RCONPort=${this.PalworldSettings.RCONPort}`)
      args.push('-RCONEnabled=True')
    }

    if (this.settings.publicLobby) args.push('-publiclobby')

    const logsDir = join(this.installPath, 'Logs')
    mkdirSync(logsDir, { recursive: true })
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const logFile = join(logsDir, `Server_${timestamp}.log`)
    writeFileSync(logFile, '') // initialize log file

    const outFd = openSync(logFile, 'a')

    // Spawn server process directly, piping stdout/stderr directly into the file descriptor
    // This avoids anonymous pipe block-buffering from Unreal Engine
    this._childProcess = spawn(this.targetExe, args, {
      cwd: this.installPath,
      stdio: ['ignore', outFd, outFd],
      windowsHide: true,
      detached: isLinux
    })

    this.pid = this._childProcess.pid
    logFn(`Server spawned with PID ${this.pid}.`)

    let bytesRead = 0
    let tailBuffer = ''
    this._tailInterval = setInterval(() => {
      if (existsSync(logFile)) {
        const stats = statSync(logFile)
        if (stats.size > bytesRead) {
          const stream = createReadStream(logFile, {
            start: bytesRead,
            end: stats.size - 1
          })
          stream.on('data', (chunk: string | Buffer) => {
            const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk
            tailBuffer += text

            let nlIndex
            while ((nlIndex = tailBuffer.indexOf('\n')) !== -1) {
              const line = tailBuffer.substring(0, nlIndex)
              tailBuffer = tailBuffer.substring(nlIndex + 1)
              let str = line.trim()
              if (str) {
                // Strip the duplicate timestamp generated by PalServer
                str = str.replace(
                  /^\[\d{4}[-.]\d{2}[-.]\d{2}[-\s]\d{2}[:.]\d{2}[:.]\d{2}(:\d+)?\](\[\s*\d+\])?\s*/,
                  ''
                )
                logFn(`[Server] ${str}`)
              }
            }
          })
          bytesRead = stats.size
        }
      }
    }, 500)

    this._childProcess.on('error', (err) => {
      logFn(`Server process error: ${err.message}`)
    })

    this._childProcess.on('exit', () => {
      this._childProcess = null
      this.pid = undefined
      if (this.state !== 'stopped') {
        this.state = 'stopped'
        this.saveConfig()
        this.emitStatus()
        this._log?.('Server process exited.')
      }
    })

    this.state = 'running'
    this.resetTimers()
    this.saveConfig()
    this.emitStatus()
    logFn('Server process started.')
  }

  async forceSave(log?: (msg: string) => void): Promise<void> {
    const logFn = log || this._log || (() => {})
    const api = this.getApi()
    if (api) {
      logFn('Saving server state...')
      try {
        await api.save()
      } catch (e: unknown) {
        logFn(`Failed to save via REST API: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  async sendRconCommand(cmd: string): Promise<string> {
    if (!this.isRunning()) throw new Error('Server is not running')
    const rconEnabled = String(this.PalworldSettings.RCONEnabled).toLowerCase() === 'true'
    if (!rconEnabled) throw new Error('RCON is not enabled for this server in configuration')

    const port = Number(this.PalworldSettings.RCONPort) || 25575
    const password = String(this.PalworldSettings.AdminPassword || '')
    if (!password) throw new Error('Admin password is required for RCON')

    const rcon = new GameRCON('127.0.0.1', port, password, 31)
    this._log?.(`> rcon ${cmd}`)
    try {
      await rcon.connect()
      const res = await rcon.send(cmd)
      if (res && res.trim()) {
        this._log?.(`[RCON] ${res}`)
      }
      return res
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e)
      this._log?.(`[RCON Error] ${errMsg}`)
      throw new Error(errMsg)
    } finally {
      await rcon.close()
    }
  }

  async stop(log?: (msg: string) => void): Promise<void> {
    if (this._stopInProgress) return
    if (!this.isRunning()) return

    const logFn = log || this._log || (() => {})
    this._manualStop = true
    this._stopInProgress = true

    try {
      if (this._tailInterval) {
        clearInterval(this._tailInterval)
        this._tailInterval = undefined
      }

      this.state = 'stopping'
      this.emitStatus()

      logFn('Initiating multi-tier shutdown sequence...')

      const rconEnabled = String(this.PalworldSettings.RCONEnabled).toLowerCase() === 'true'
      const rconPassword = String(this.PalworldSettings.AdminPassword || '')
      let rconFailed = false

      if (rconEnabled && rconPassword) {
        logFn('Attempting graceful shutdown via RCON...')
        try {
          await this.sendRconCommand('Save')
          logFn('RCON Save command sent.')
        } catch (e: unknown) {
          logFn(`RCON Save failed: ${e instanceof Error ? e.message : String(e)}`)
        }

        try {
          await this.sendRconCommand('Shutdown 10 Server is shutting down.')
          logFn('RCON Shutdown command sent.')
        } catch (e: unknown) {
          logFn(`RCON Shutdown failed: ${e instanceof Error ? e.message : String(e)}`)
          rconFailed = true
        }
      } else {
        rconFailed = true
        logFn('RCON is not configured for this instance. Skipping RCON shutdown tier.')
      }

      if (rconFailed) {
        const api = this.getApi()
        if (api) {
          logFn('Attempting graceful shutdown via REST API fallback...')
          await this.forceSave(logFn)
          try {
            await api.shutdown(10, 'Server will shutdown in 10 seconds.')
            logFn('REST API Shutdown command sent.')
          } catch (e: unknown) {
            logFn(`REST API Shutdown command failed: ${e instanceof Error ? e.message : String(e)}`)
          }
        } else {
          logFn('REST API is not enabled. Skipping REST API shutdown tier.')
        }
      }

      const SHUTDOWN_GRACE_PERIOD_SEC = 40
      logFn(`Waiting up to ${SHUTDOWN_GRACE_PERIOD_SEC}s for process to exit...`)
      for (let i = 0; i < SHUTDOWN_GRACE_PERIOD_SEC; i++) {
        await sleep(1000)
        if (!this.isRunning()) break
      }

      if (this.isRunning()) {
        if (rconEnabled && rconPassword) {
          logFn('Process still running. Attempting RCON DoExit fallback...')
          try {
            await this.sendRconCommand('DoExit')
            logFn('RCON DoExit command sent.')
          } catch (e: unknown) {
            logFn(`RCON DoExit failed: ${e instanceof Error ? e.message : String(e)}`)
          }

          const DO_EXIT_GRACE_PERIOD_SEC = 10
          logFn(`Waiting up to ${DO_EXIT_GRACE_PERIOD_SEC}s for process to exit...`)
          for (let i = 0; i < DO_EXIT_GRACE_PERIOD_SEC; i++) {
            await sleep(1000)
            if (!this.isRunning()) break
          }
        }
      }

      if (this.isRunning()) {
        logFn('Process still running. Forcefully killing process tree...')
        await this.kill(logFn, true)
      } else {
        logFn('Server stopped gracefully.')
      }
    } finally {
      this._stopInProgress = false
    }
  }

  async kill(log?: (msg: string) => void, skipSave = false): Promise<void> {
    const logFn = log || this._log || (() => {})
    this._manualStop = true

    if (this._tailInterval) {
      clearInterval(this._tailInterval)
      this._tailInterval = undefined
    }

    if (!skipSave) {
      await this.forceSave(logFn)
    }

    await killProcessTree(this.pid)
    this._childProcess = null
    this.pid = undefined
    this.state = 'stopped'
    this.saveConfig()
    this.emitStatus()
    logFn('Server killed.')
  }

  /**
   * Called during initialization or by the monitor to verify if the cached PID
   * really still belongs to this server. Recovers PID if lost.
   */
  async verifyAndRecoverPid(): Promise<boolean> {
    if (this.pid) {
      const valid = await verifyPid(this.pid, this.targetExe)
      if (valid) return true
    }

    // PID lost or invalid. Attempt to recover it by path scanning.
    const recovered = await findProcessIdByPath(this.targetExe, this.installPath)
    if (recovered) {
      this.pid = recovered
      this.saveConfig()
      return true
    }

    this.pid = undefined
    return false
  }

  isRunning(): boolean {
    return isProcessAlive(this.pid)
  }

  // ── REST API ───────────────────────────────────────────────────

  public getApi(): PalworldApi | null {
    const enabled =
      this.PalworldSettings.RESTAPIEnabled === true ||
      this.PalworldSettings.RESTAPIEnabled === 'True'
    const port = this.PalworldSettings.RESTAPIPort
    const adminPassword = this.PalworldSettings.AdminPassword
    if (!enabled || !port || !adminPassword) return null

    return new PalworldApi(Number(port), String(adminPassword))
  }

  async getMetrics(): Promise<InstanceMetrics | null> {
    const api = this.getApi()
    if (!api) return null
    try {
      const res = await api.metrics()
      return {
        players: String(res.currentplayernum ?? 0),
        maxPlayers: String(res.maxplayernum ?? 32),
        fps: String(res.serverfps ?? 'N/A'),
        frametime: String(res.serverframetime ?? 'N/A'),
        uptimeSec: res.uptime ?? 0,
        baseCamps: String(res.basecampnum ?? 0),
        days: String(res.days ?? 0)
      }
    } catch {
      return null
    }
  }

  async getServerInfo(): Promise<InstanceInfo | null> {
    const api = this.getApi()
    if (!api) return null
    try {
      const res = await api.info()
      return {
        version: res.version,
        serverName: res.servername,
        description: res.description,
        worldGuid: res.worldguid
      }
    } catch {
      return null
    }
  }

  async sendAnnouncement(message: string): Promise<void> {
    const api = this.getApi()
    if (!api) return
    try {
      await api.broadcast(message)
      this._log?.(`Announcement sent: ${message}`)
    } catch (err: unknown) {
      this._log?.(
        `Failed to send announcement: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  async kickPlayer(userId: string, message: string): Promise<void> {
    const api = this.getApi()
    if (!api) throw new Error('REST API not enabled')
    await api.kick(userId, message)
    this.playerDb.setPlayerStatus(userId, 'offline')
  }

  async banPlayer(userId: string, message: string): Promise<void> {
    const api = this.getApi()
    if (!api) throw new Error('REST API not enabled')
    await api.ban(userId, message)
    this.playerDb.setPlayerStatus(userId, 'banned')
  }

  async unbanPlayer(userId: string): Promise<void> {
    const api = this.getApi()
    if (!api) throw new Error('REST API not enabled')
    await api.unban(userId)
    this.playerDb.setPlayerStatus(userId, 'offline')
  }

  // ── Helpers ────────────────────────────────────────────────────

  getSaveFilePath(): string | null {
    const dedicatedName = getDedicatedName(this.gameUserSettingsFile)
    if (!dedicatedName) return null
    return join(this.savedDir, 'SaveGames', '0', dedicatedName, 'Level.sav')
  }

  emitStatus(): void {
    const now = Date.now()
    if (now - this._lastStatusEmit < 200) {
      if (!this._emitTimeout) {
        this._emitTimeout = setTimeout(() => {
          this._emitTimeout = null
          this._lastStatusEmit = Date.now()
          this._onStatusUpdate?.(this.toStatus())
        }, 200)
      }
      return
    }

    if (this._emitTimeout) {
      clearTimeout(this._emitTimeout)
      this._emitTimeout = null
    }
    this._lastStatusEmit = now
    this._onStatusUpdate?.(this.toStatus())
  }

  // ── INI Configuration ───────────────────────────────────────────

  get settingsIniPath(): string {
    return join(
      this.installPath,
      'Pal',
      'Saved',
      'Config',
      isLinux ? 'LinuxServer' : 'WindowsServer',
      'PalWorldSettings.ini'
    )
  }

  importFromIni(): void {
    const iniSettings = getAllSettings(this.settingsIniPath)
    if (Object.keys(iniSettings).length === 0) return

    let changed = false
    for (const schema of PALWORLD_SCHEMA) {
      if (!schema.hideInUI && schema.key in iniSettings) {
        let iniVal: string | number | boolean = iniSettings[schema.key]

        if (
          schema.type === 'Numeric' ||
          schema.type === 'Floating' ||
          schema.type === 'NumericSigned'
        ) {
          iniVal = Number(iniVal)
          if (isNaN(iniVal)) continue
        } else if (schema.type === 'TrueFalse') {
          iniVal = String(iniVal).toLowerCase() === 'true'
        }

        const currentVal = this.PalworldSettings[schema.key] ?? schema.defaultValue
        if (currentVal !== iniVal) {
          this.PalworldSettings[schema.key] = iniVal
          changed = true
        }
      }
    }

    if (changed) {
      try {
        writeFileSync(this.instanceJsonPath, JSON.stringify(this.toConfig(), null, 2), 'utf-8')
      } catch (e) {
        this._log?.(
          `Failed to save instance config after import: ${e instanceof Error ? e.message : String(e)}`
        )
      }
    }
  }

  syncIniSettings(): void {
    const updates: Record<string, string | null | undefined> = {}

    for (const schema of PALWORLD_SCHEMA) {
      let val = this.PalworldSettings[schema.key]
      val = smartFixSetting(schema, val)

      if (schema.requiresQuotes) {
        updates[schema.key] = `"${val}"`
      } else {
        updates[schema.key] = String(val)
      }
    }

    // Ensure multiplay is true for servers
    updates.bIsMultiplay = 'True'

    setSettingValues(this.settingsIniPath, updates)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
