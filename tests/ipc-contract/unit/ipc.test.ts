import { describe, it, expect, vi } from 'vitest'
import { registerControlHandlers } from '../../../src/main/ipcs/server/control'
import { registerFsHandlers } from '../../../src/main/ipcs/server/fs'
import { registerInstanceHandlers } from '../../../src/main/ipcs/server/instances'
import { InstanceManager } from '../../../src/main/services/server/instanceManager'

const mockHandlers = new Map<string, (...args: unknown[]) => unknown>()
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, cb: (...args: unknown[]) => unknown) => {
      mockHandlers.set(channel, cb)
    }
  },
  shell: {
    showItemInFolder: vi.fn(),
    openPath: vi.fn()
  }
}))

describe('ipc-contract - unit', () => {
  it('should test real registered IPC handlers and assert on their error shapes', async () => {
    const mockManager = {
      get: vi.fn(),
      getInstance: vi.fn(),
      list: vi.fn()
    } as unknown as InstanceManager

    const mockGetWindow = vi.fn()

    registerControlHandlers(mockManager, mockGetWindow)
    registerFsHandlers(mockManager)
    registerInstanceHandlers(mockManager, mockGetWindow)

    // 1. control:start (native throw)
    const startHandler = mockHandlers.get('control:start')
    expect(startHandler).toBeDefined()
    ;(mockManager.get as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('Instance not found')
    })
    await expect(startHandler!({}, 'invalid')).rejects.toThrow('Instance not found')

    // 2. control:stop (native throw)
    const stopHandler = mockHandlers.get('control:stop')
    expect(stopHandler).toBeDefined()
    ;(mockManager.get as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('Instance not found')
    })
    await expect(stopHandler!({}, 'invalid')).rejects.toThrow('Instance not found')

    // 3. control:kill (native throw)
    const killHandler = mockHandlers.get('control:kill')
    expect(killHandler).toBeDefined()
    ;(mockManager.get as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('Instance not found')
    })
    await expect(killHandler!({}, 'invalid')).rejects.toThrow('Instance not found')

    // 4. fs:writeFile (native throw)
    const writeHandler = mockHandlers.get('fs:writeFile')
    expect(writeHandler).toBeDefined()
    ;(mockManager.get as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('Instance not found')
    })
    await expect(writeHandler!({}, 'invalid', 'file.txt', 'content')).rejects.toThrow(
      'Instance not found'
    )

    // 5. instances:sendRcon (_ipcError shape wrapper)
    const rconHandler = mockHandlers.get('instances:sendRcon')
    expect(rconHandler).toBeDefined()
    // It uses getInstance instead of get, returning undefined if not found
    ;(mockManager.getInstance as ReturnType<typeof vi.fn>).mockReturnValueOnce(undefined)
    const rconRes = (await rconHandler!({}, 'invalid', 'ShowPlayers')) as { _ipcError: string }
    expect(rconRes).toHaveProperty('_ipcError')
    expect(rconRes._ipcError).toContain('Instance not found')
  })
})
