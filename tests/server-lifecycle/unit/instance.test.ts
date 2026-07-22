import { describe, it, expect, vi } from 'vitest'
import { ServerInstance } from '../../../src/main/services/server/instance'
import * as processControl from '../../../src/main/services/system/processControl'

vi.mock('../../../src/main/services/system/processControl', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../src/main/services/system/processControl')>()
  return {
    ...actual,
    killProcessTree: vi.fn(),
    findProcessIdByPath: vi.fn()
  }
})

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>()
  return {
    ...actual,
    exec: vi.fn(),
    execFile: vi.fn(),
    spawn: vi.fn(() => ({
      pid: 9999,
      on: vi.fn(),
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() }
    }))
  }
})

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn((path: import('fs').PathOrFileDescriptor, options?: unknown) => {
      if (path.toString().endsWith('players.json')) return '[]'
      return actual.readFileSync(path, options as BufferEncoding)
    }),
    promises: {
      ...actual.promises,
      writeFile: vi.fn().mockResolvedValue(undefined)
    }
  }
})

describe('instance.ts - Lifecycle', () => {
  it('start() transitions state correctly and kills old process if running', async () => {
    const inst = ServerInstance.create({ name: 'Test' }, '/tmp/test', 27015, 'id')

    vi.spyOn(inst, 'saveConfig').mockImplementation(() => {})
    vi.spyOn(inst, 'updateIfNeeded').mockResolvedValue(false)
    const { killProcessTree } = await import('../../../src/main/services/system/processControl')

    await inst.start()
    expect(inst.state).toBe('running')
    expect(inst.pid).toBe(9999)

    vi.spyOn(inst, 'isRunning').mockReturnValue(true)
    await inst.start()
    expect(killProcessTree).toHaveBeenCalledWith(9999)
  })

  it('stop() executes multi-tier fallback (RCON -> REST -> DoExit -> Kill) and maintains stopping state', async () => {
    vi.useFakeTimers()
    const inst = ServerInstance.create({ name: 'Test' }, '/tmp/test', 27015, 'id')
    inst.state = 'running'
    inst.pid = 9999

    inst.PalworldSettings = {
      RCONEnabled: 'True',
      AdminPassword: 'pass'
    }

    vi.spyOn(inst, 'saveConfig').mockImplementation(() => {})
    vi.spyOn(inst, 'isRunning').mockReturnValue(true)

    const callOrder: string[] = []

    vi.spyOn(inst, 'kill').mockImplementation(async () => {
      callOrder.push('kill')
    })

    vi.spyOn(inst, 'sendRconCommand').mockImplementation(async (cmd: string) => {
      callOrder.push(`rcon:${cmd}`)
      throw new Error('Mock RCON Error')
    })

    const mockApi = {
      shutdown: vi.fn().mockImplementation(async () => {
        callOrder.push('rest:shutdown')
        throw new Error('Mock REST Error')
      }),
      save: vi.fn().mockImplementation(async () => {
        callOrder.push('rest:save')
        return true
      })
    }
    vi.spyOn(inst, 'getApi').mockReturnValue(mockApi as unknown as ReturnType<typeof inst.getApi>)

    const stopPromise = inst.stop()

    expect(inst.state).toBe('stopping')

    await vi.advanceTimersByTimeAsync(40000)

    expect(inst.state).toBe('stopping')

    await vi.advanceTimersByTimeAsync(10000)

    await stopPromise

    expect(callOrder).toEqual([
      'rcon:Save',
      'rcon:Shutdown 10 Server is shutting down.',
      'rest:save',
      'rest:shutdown',
      'rcon:DoExit',
      'kill'
    ])

    vi.useRealTimers()
  })

  it('kill() calls killProcessTree with correct PID', async () => {
    const inst = ServerInstance.create({ name: 'Test' }, '/tmp/test', 27015, 'id')
    inst.state = 'running'
    inst.pid = 9999

    vi.spyOn(inst, 'saveConfig').mockImplementation(() => {})
    vi.spyOn(inst, 'isRunning').mockReturnValue(true)

    await inst.kill()

    expect(processControl.killProcessTree).toHaveBeenCalledWith(9999)
    expect(inst.state).toBe('stopped')
    expect(inst.pid).toBeUndefined()
  })

  it('start() performs auto-update when enabled and skips when disabled', async () => {
    const inst = ServerInstance.create(
      { name: 'Test', settings: { autoUpdate: true } },
      '/tmp/test',
      27015,
      'id'
    )
    vi.spyOn(inst, 'saveConfig').mockImplementation(() => {})
    const updateSpy = vi.spyOn(inst, 'updateIfNeeded').mockResolvedValue(false)

    await inst.start()
    expect(updateSpy).toHaveBeenCalledTimes(1)

    inst.settings.autoUpdate = false
    await inst.start()
    expect(updateSpy).toHaveBeenCalledTimes(1)
  })

  it('start() handles auto-update errors gracefully and still starts server', async () => {
    const inst = ServerInstance.create(
      { name: 'Test', settings: { autoUpdate: true } },
      '/tmp/test',
      27015,
      'id'
    )
    vi.spyOn(inst, 'saveConfig').mockImplementation(() => {})
    vi.spyOn(inst, 'updateIfNeeded').mockRejectedValue(new Error('Network failure'))

    const logs: string[] = []
    await inst.start((msg) => logs.push(msg))

    expect(inst.state).toBe('running')
    expect(logs.some((l) => l.includes('Auto-update check failed'))).toBe(true)
  })
})
