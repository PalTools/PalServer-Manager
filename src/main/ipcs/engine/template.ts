import { ipcMain, BrowserWindow } from 'electron'
import { templateManager, TemplateStatus } from '../../services/engine/templateManager'

export function registerTemplateHandlers(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('template:getStatus', (): TemplateStatus => {
    return templateManager.getTemplateStatus()
  })

  ipcMain.handle('template:install', async (): Promise<{ success: boolean; error?: string }> => {
    const win = getMainWindow()

    const onProgress = (stage: string, percentage: number): void => {
      try {
        win?.webContents.send('template:progress', { stage, percentage })
      } catch {
        void 0
      }
    }

    const log = (msg: string): void => {
      console.log(`[TemplateEngine] ${msg}`)
    }

    try {
      await templateManager.installTemplate(log, onProgress)
      return { success: true }
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('template:checkForUpdate', async () => {
    const log = (msg: string): void => {
      console.log(`[TemplateEngine Check] ${msg}`)
    }
    try {
      return await templateManager.checkForUpdate(log)
    } catch (e: unknown) {
      return {
        needsUpdate: false,
        currentBuildId: null,
        remoteBuildId: null,
        error: e instanceof Error ? e.message : String(e)
      }
    }
  })
}
