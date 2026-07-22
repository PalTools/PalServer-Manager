import { ipcMain, shell, BrowserWindow } from 'electron'
import { InstanceManager } from '../../services/server/instanceManager'
import { PALWORLD_SCHEMA } from '../../services/server/palworldSchema'
import { getLogFn, startInstanceProcess } from './control'

export function registerInstanceHandlers(
  manager: InstanceManager,
  getMainWindow: () => BrowserWindow | null
): void {
  ipcMain.handle('instances:list', () => {
    return manager.list().map((i) => i.toConfig())
  })

  ipcMain.handle('instances:getSettingsSchema', () => PALWORLD_SCHEMA)

  ipcMain.handle('instances:get', (_event, id: string) => {
    return manager.get(id).toConfig()
  })

  ipcMain.handle('instances:create', async (_event, input) => {
    try {
      const instance = await manager.createInstance(input)

      startInstanceProcess(manager, instance.id, getMainWindow()).catch((err) => {
        const win = getMainWindow()
        const logFn = getLogFn(instance.id, win)
        logFn(`Initialization failed: ${err.message}`)
      })

      return instance.toConfig()
    } catch (err: unknown) {
      return { _ipcError: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('instances:update', (_event, id: string, patch) => {
    try {
      const instance = manager.updateInstance(id, patch)
      return instance.toConfig()
    } catch (err: unknown) {
      return { _ipcError: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('instances:delete', (_event, id: string, deleteFiles: boolean) => {
    try {
      manager.deleteInstance(id, deleteFiles)
      return { success: true }
    } catch (err: unknown) {
      return { _ipcError: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('instances:sendRcon', async (_event, id: string, cmd: string) => {
    try {
      const instance = manager.getInstance(id)
      if (!instance) throw new Error('Instance not found')
      return await instance.sendRconCommand(cmd)
    } catch (err: unknown) {
      return { _ipcError: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('system:openFolder', (_event, folderPath: string) => {
    shell.openPath(folderPath)
  })
}
