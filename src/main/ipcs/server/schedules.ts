import { ipcMain } from 'electron'
import { InstanceManager } from '../../services/server/instanceManager'
import { ScheduleService } from '../../services/server/scheduleService'
import { Schedule } from '../../services/core/types'

export const scheduleService = new ScheduleService()

export function registerScheduleHandlers(manager: InstanceManager): void {
  scheduleService.startEvaluator(() => manager.list())

  ipcMain.handle('instances:listSchedules', (_event, id: string) => {
    try {
      const instance = manager.get(id)
      return scheduleService.listSchedules(instance)
    } catch (err: unknown) {
      return { _ipcError: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(
    'instances:saveSchedule',
    (_event, id: string, scheduleInput: Partial<Schedule>) => {
      try {
        const instance = manager.get(id)
        const saved = scheduleService.saveSchedule(instance, scheduleInput)
        return saved
      } catch (err: unknown) {
        return { _ipcError: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  ipcMain.handle('instances:deleteSchedule', (_event, id: string, scheduleId: string) => {
    try {
      const instance = manager.get(id)
      scheduleService.deleteSchedule(instance, scheduleId)
      return { success: true }
    } catch (err: unknown) {
      return { _ipcError: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('instances:runScheduleNow', async (_event, id: string, scheduleId: string) => {
    try {
      const instance = manager.get(id)
      const history = await scheduleService.runScheduleNow(instance, scheduleId)
      return history
    } catch (err: unknown) {
      return { _ipcError: err instanceof Error ? err.message : String(err) }
    }
  })
}
