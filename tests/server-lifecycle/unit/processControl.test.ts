import { describe, it, expect, vi, afterEach } from 'vitest'
import * as cp from 'child_process'

const mockIsLinux = false
vi.mock('../../../src/main/core/types', () => ({
  get isLinux() {
    return mockIsLinux
  }
}))

// Need to mock child_process for execution, but since it's unit test, we can mock it entirely.
vi.mock('child_process', () => ({
  exec: vi.fn(),
  execFile: vi.fn()
}))

describe('processControl.ts - killProcessTree platform branching', () => {
  const originalPlatform = process.platform

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    vi.resetAllMocks()
  })

  it('should construct correct taskkill command on win32', async () => {
    vi.resetModules()
    Object.defineProperty(process, 'platform', { value: 'win32' })
    const { killProcessTree } = await import('../../../src/main/services/system/processControl')

    vi.spyOn(process, 'kill').mockImplementation(() => true)

    const execMock = vi.mocked(cp.exec)
    execMock.mockImplementation((...args: unknown[]) => {
      const cb = args.find((a) => typeof a === 'function') as (
        error: Error | null,
        stdout: { stdout: string; stderr: string }
      ) => void
      if (cb) cb(null, { stdout: '', stderr: '' })
      return {} as ReturnType<typeof cp.exec>
    })

    await killProcessTree(1234)

    expect(execMock).toHaveBeenCalledTimes(1)
    expect(execMock.mock.calls[0][0]).toContain('taskkill /F /PID 1234 /T')
  })

  it('should construct correct process.kill(-pid) on linux', async () => {
    vi.resetModules()
    Object.defineProperty(process, 'platform', { value: 'linux' })
    const { killProcessTree } = await import('../../../src/main/services/system/processControl')

    const processKillMock = vi.spyOn(process, 'kill').mockImplementation(() => true)

    await killProcessTree(5678)

    // Should be called twice: once for isProcessAlive(5678, 0) and once for -5678, SIGKILL
    expect(processKillMock).toHaveBeenCalledWith(-5678, 'SIGKILL')
  })
})

describe('processControl.ts - findProcessIdByPath native-path matching', () => {
  const originalPlatform = process.platform

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    vi.resetAllMocks()
  })

  it('should correctly parse wmic output on win32', async () => {
    vi.resetModules()
    Object.defineProperty(process, 'platform', { value: 'win32' })
    const { findProcessIdByPath } = await import('../../../src/main/services/system/processControl')

    const execMock = vi.mocked(cp.exec)

    // Mock the wmic output. Node, ExecutablePath, ProcessId (csv)
    execMock.mockImplementation((...args: unknown[]) => {
      const cmd = args[0] as string
      const cb = args.find((a) => typeof a === 'function') as (
        error: Error | null,
        stdout: { stdout: string }
      ) => void
      if (cmd.includes('wmic')) {
        cb(null, {
          stdout:
            '\nNode,ExecutablePath,ProcessId\nMyNode,C:\\PalServer\\Instance\\PalServer.exe,1234\n'
        })
      } else {
        cb(null, { stdout: '' })
      }
      return {} as ReturnType<typeof cp.exec>
    })

    const res = await findProcessIdByPath('PalServer.exe', 'C:\\PalServer\\Instance')
    expect(res).toBe(1234)
  })

  it('should safely reject sibling-directory false-positive on win32', async () => {
    vi.resetModules()
    Object.defineProperty(process, 'platform', { value: 'win32' })
    const { findProcessIdByPath } = await import('../../../src/main/services/system/processControl')

    vi.spyOn(process, 'kill').mockImplementation(() => true)
    const execMock = vi.mocked(cp.exec)

    // Mock wmic output from a sibling directory 'Instance2'
    execMock.mockImplementation((...args: unknown[]) => {
      const cmd = args[0] as string
      const cb = args.find((a) => typeof a === 'function') as (
        error: Error | null,
        stdout: { stdout: string }
      ) => void
      if (cmd.includes('wmic')) {
        cb(null, {
          stdout:
            '\nNode,ExecutablePath,ProcessId\nMyNode,C:\\PalServer\\Instance2\\PalServer.exe,1234\n'
        })
      } else {
        cb(null, { stdout: '' })
      }
      return {} as ReturnType<typeof cp.exec>
    })

    const res = await findProcessIdByPath('PalServer.exe', 'C:\\PalServer\\Instance\\')
    expect(res).toBeNull()
  })
})
