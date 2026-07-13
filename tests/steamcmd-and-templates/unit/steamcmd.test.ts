import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installOrUpdate, initSteamCmd } from '../../../src/main/services/engine/steamcmd'
import * as cp from 'child_process'
import { join } from 'path'
import { tmpdir } from 'os'

vi.mock('child_process', () => {
  let active = 0
  let maxActive = 0

  return {
    __getConcurrency: () => maxActive,
    __resetConcurrency: () => {
      active = 0
      maxActive = 0
    },
    spawn: vi.fn(() => {
      active++
      if (active > maxActive) maxActive = active
      return {
        on: (event: string, cb: (...args: unknown[]) => void) => {
          if (event === 'close') {
            setTimeout(() => {
              active--
              cb(0)
            }, 50)
          }
        },
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() }
      }
    })
  }
})

describe('steamcmd-and-templates - unit', () => {
  beforeEach(() => {
    const cpMock = cp as unknown as { __resetConcurrency?: () => void }
    if (cpMock.__resetConcurrency) cpMock.__resetConcurrency()
    initSteamCmd(join(tmpdir(), 'test_steamcmd'))
  })

  it('queueTail serialization: fire concurrent install requests, confirm strictly sequential execution', async () => {
    const cpMock = cp as unknown as { __getConcurrency: () => number }

    // Fire 3 concurrent requests
    const p1 = installOrUpdate(join(tmpdir(), '1'))
    const p2 = installOrUpdate(join(tmpdir(), '2'))
    const p3 = installOrUpdate(join(tmpdir(), '3'))

    await Promise.all([p1, p2, p3])

    // If it was sequential, maxActive should be 1
    // (Meaning spawn was only called once at a time)
    expect(cpMock.__getConcurrency()).toBe(1)
  })
})
