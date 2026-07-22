import { ipcMain, BrowserWindow } from 'electron'
import { InstanceManager } from '../../services/server/instanceManager'
import { InstanceConfig } from '../../services/core/types'
import { startMonitor } from '../../services/system/monitor'
import { trimRamUsage } from '../../services/system/processControl'

const activeMonitors = new Map<string, { stop: () => void }>()

const instanceLogs = new Map<string, string[]>()

export function getLogFn(id: string, win: BrowserWindow | null): (msg: string) => void {
  return (msg: string): void => {
    const now = new Date()
    const h = now.getHours() % 12 || 12
    const m = String(now.getMinutes()).padStart(2, '0')
    const s = String(now.getSeconds()).padStart(2, '0')
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM'
    const timestamp = `[${h}:${m}:${s}${ampm}]`
    const fullMsg = `${timestamp} ${msg}`

    if (!instanceLogs.has(id)) instanceLogs.set(id, [])
    const logs = instanceLogs.get(id)!
    logs.push(fullMsg)
    if (logs.length > 500) logs.splice(0, logs.length - 500)

    try {
      win?.webContents.send('instance:log', id, fullMsg)
    } catch {
      void 0
    }
  }
}

export async function startInstanceProcess(
  manager: InstanceManager,
  id: string,
  win: BrowserWindow | null
): Promise<InstanceConfig> {
  const instance = manager.get(id)
  const logFn = getLogFn(id, win)

  instance.setLogFn(logFn)

  const emitStatus = (status: unknown): void => {
    try {
      win?.webContents.send('instance:status', status)
    } catch {
      void 0
    }
  }

  instance.setOnStatusUpdate(emitStatus)

  await instance.start(logFn)

  if (activeMonitors.has(id)) {
    activeMonitors.get(id)!.stop()
  }

  const monitor = startMonitor(instance, emitStatus, logFn)
  activeMonitors.set(id, monitor)

  return instance.toConfig()
}

export function registerControlHandlers(
  manager: InstanceManager,
  getMainWindow: () => BrowserWindow | null
): void {
  ipcMain.handle('control:start', async (_event, id: string) => {
    return startInstanceProcess(manager, id, getMainWindow())
  })

  ipcMain.handle('control:stop', async (_event, id: string) => {
    const instance = manager.get(id)
    const win = getMainWindow()
    const logFn = getLogFn(id, win)

    if (activeMonitors.has(id)) {
      activeMonitors.get(id)!.stop()
      activeMonitors.delete(id)
    }

    await instance.stop(logFn)
    return instance.toConfig()
  })

  ipcMain.handle('control:kill', async (_event, id: string) => {
    const instance = manager.get(id)
    const win = getMainWindow()
    const logFn = getLogFn(id, win)

    if (activeMonitors.has(id)) {
      activeMonitors.get(id)!.stop()
      activeMonitors.delete(id)
    }

    instance.kill(logFn)
    return instance.toConfig()
  })

  ipcMain.handle('control:logs', (_event, id: string) => {
    return instanceLogs.get(id) || []
  })

  ipcMain.handle('control:trimRam', async (_event, id: string) => {
    const instance = manager.get(id)
    const win = getMainWindow()
    const logFn = getLogFn(id, win)

    const result = await trimRamUsage(instance.pid)
    logFn(result)
    return { success: true, message: result }
  })
}

export function stopAllMonitors(): void {
  for (const [, monitor] of activeMonitors) {
    monitor.stop()
  }
  activeMonitors.clear()
}
