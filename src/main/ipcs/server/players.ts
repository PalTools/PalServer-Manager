import { ipcMain } from 'electron'
import { InstanceManager } from '../../services/server/instanceManager'
import { PersistedPlayer } from '../../services/server/playerDatabase'

export function registerPlayerHandlers(manager: InstanceManager): void {
  ipcMain.handle('players:list', async (_event, id: string): Promise<PersistedPlayer[]> => {
    const instance = manager.get(id)
    return instance.playerDb.getAll()
  })

  ipcMain.handle(
    'players:kick',
    async (_event, id: string, userId: string, message: string): Promise<void> => {
      const instance = manager.get(id)
      await instance.kickPlayer(userId, message)
    }
  )

  ipcMain.handle(
    'players:ban',
    async (_event, id: string, userId: string, message: string): Promise<void> => {
      const instance = manager.get(id)
      await instance.banPlayer(userId, message)
    }
  )

  ipcMain.handle('players:unban', async (_event, id: string, userId: string): Promise<void> => {
    const instance = manager.get(id)
    await instance.unbanPlayer(userId)
  })

  ipcMain.handle('players:announce', async (_event, id: string, message: string): Promise<void> => {
    const instance = manager.get(id)
    await instance.sendAnnouncement(message)
  })
}
