import { ServerInstance } from '../server/instance'
import { getProcessUsage } from './processControl'
import { InstanceStatus } from '../core/types'

interface MonitorHandle {
  stop: () => void
}

export function startMonitor(
  instance: ServerInstance,
  onUpdate: (status: InstanceStatus) => void,
  log: (msg: string) => void
): MonitorHandle {
  let wasRunning = false
  let lastCheckTime = 0
  let lastInfoCheckTime = 0
  let lastMemoryCheckTime = 0
  let bootStartTime: number | null = null
  let bootedMessagePrinted = false
  let stopped = false
  let isTicking = false

  let cachedMemory = 'N/A'
  let cachedCpu = '0%'
  let lastPlayersCheckTime = 0

  async function handleRunningState(now: number): Promise<void> {
    if (!wasRunning) {
      instance.resetTimers()
      bootStartTime = now
      bootedMessagePrinted = false
    }
    wasRunning = true

    if (!instance.pid) {
      await instance.verifyAndRecoverPid()
    }

    const metrics = await instance.getMetrics()

    if (!instance.info || now - lastInfoCheckTime >= 60) {
      lastInfoCheckTime = now
      const info = await instance.getServerInfo()
      if (info) {
        instance.info = {
          version: info.version.split('.').slice(0, 3).join('.'),
          serverName: info.serverName,
          description: info.description,
          worldGuid: info.worldGuid
        }
      }
    }

    if (now - lastPlayersCheckTime >= 5) {
      lastPlayersCheckTime = now
      const api = instance.getApi()
      if (api) {
        try {
          const playersRes = await api.players()
          if (playersRes && playersRes.players) {
            instance.playerDb.updateActivePlayers(playersRes.players)
          } else if (Array.isArray(playersRes)) {
            instance.playerDb.updateActivePlayers(playersRes)
          }
        } catch (err: unknown) {
          const e = err as { cause?: { code?: string }; code?: string }
          if (e?.cause?.code === 'ECONNREFUSED' || e?.code === 'ECONNREFUSED') {
            void 0
          } else {
            console.error(`[Monitor] Failed to fetch players for ${instance.id}:`, err)
          }
        }
      }
    }

    const status = instance.toStatus()
    if (instance.info) {
      status.version = instance.info.version
      status.serverName = instance.info.serverName
      status.description = instance.info.description
      status.worldGuid = instance.info.worldGuid
    }

    if (metrics) {
      status.players = metrics.players
      status.maxPlayers = metrics.maxPlayers
      status.fps = metrics.fps
      status.frametime = metrics.frametime
      status.baseCamps = metrics.baseCamps
      status.days = metrics.days
      if (metrics.uptimeSec > 0) {
        const h = Math.floor(metrics.uptimeSec / 3600)
        const m = Math.floor((metrics.uptimeSec % 3600) / 60)
        const s = metrics.uptimeSec % 60
        status.uptime = `${h}h ${m}m ${s}s`
      }
    } else {
      if (bootStartTime) {
        const aliveSec = Math.floor(now - bootStartTime)
        status.uptime = `${Math.floor(aliveSec / 3600)}h ${Math.floor((aliveSec % 3600) / 60)}m`
      }
    }

    if (now - lastMemoryCheckTime >= 6) {
      lastMemoryCheckTime = now
      const usage = await getProcessUsage(instance.pid)
      if (usage) {
        cachedMemory = usage.memory
        cachedCpu = usage.cpu
      } else {
        cachedMemory = 'N/A'
        cachedCpu = '0%'
      }
    }
    status.memory = cachedMemory
    status.cpu = cachedCpu

    if (!instance.info) {
      status.state = 'running'
      instance.state = 'running'
      onUpdate(status)
      return
    }

    if (!bootedMessagePrinted && bootStartTime) {
      const bootTime = now - bootStartTime
      const bootStr =
        bootTime < 60
          ? `${Math.floor(bootTime)}s`
          : `${Math.floor(bootTime / 60)}m ${Math.floor(bootTime % 60)}s`
      log(`Server is fully booted up! Boot time: ${bootStr}`)
      bootedMessagePrinted = true
    }

    onUpdate(status)

    if (now - lastCheckTime >= 60) {
      lastCheckTime = now
    }
  }

  async function handleOfflineState(): Promise<void> {
    const status = instance.toStatus()
    status.state = 'stopped'
    bootedMessagePrinted = false
    bootStartTime = null
    cachedMemory = 'N/A'

    if (wasRunning) {
      if (instance.manualStop) {
        log('Server stopped manually.')
        instance.manualStop = false
        instance.state = 'stopped'
        instance.saveConfig()
      } else {
        log('Server crashed! Restarting instantly...')
        await sleep(2000)
        await instance.start(log)
      }
      wasRunning = false
    }

    onUpdate(status)
  }

  const tick = async (): Promise<void> => {
    if (stopped || isTicking) return
    isTicking = true

    try {
      if (!instance.pid && instance.state === 'running') {
        await instance.verifyAndRecoverPid()
      }

      const running = instance.isRunning()
      const now = Date.now() / 1000

      if (running) {
        await handleRunningState(now)
      } else {
        await handleOfflineState()
      }
    } finally {
      isTicking = false
    }
  }

  const intervalId = setInterval(() => {
    tick().catch((err) => {
      log(`Monitor error: ${err}`)
    })
  }, 3000)

  tick().catch(console.error)

  return {
    stop: (): void => {
      stopped = true
      clearInterval(intervalId)
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
