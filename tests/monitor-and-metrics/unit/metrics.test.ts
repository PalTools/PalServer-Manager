import { describe, it, expect, vi } from 'vitest'
import { ServerInstance } from '../../../src/main/services/server/instance'

describe('monitor-and-metrics - unit', () => {
  it('REST metrics response parsing with actual mapping function', async () => {
    const inst = ServerInstance.create({ name: 'Test' }, '/tmp/test', 27015, 'id')

    vi.spyOn(inst, 'getApi').mockReturnValue({
      metrics: async () => ({
        currentplayernum: 5,
        maxplayernum: 32,
        serverfps: 60.5,
        serverframetime: 16.5,
        uptime: 1000,
        basecampnum: 2,
        days: 50
      })
    } as unknown as ReturnType<typeof inst.getApi>)

    const metrics = await inst.getMetrics()

    expect(metrics).toBeDefined()
    expect(metrics!.players).toBe('5')
    expect(metrics!.maxPlayers).toBe('32')
    expect(metrics!.fps).toBe('60.5')
    expect(metrics!.uptimeSec).toBe(1000)
  })

  it('malformed/partial payloads should not crash', async () => {
    const inst = ServerInstance.create({ name: 'Test' }, '/tmp/test', 27015, 'id')

    vi.spyOn(inst, 'getApi').mockReturnValue({
      metrics: async () => ({})
    } as unknown as ReturnType<typeof inst.getApi>)

    const metrics = await inst.getMetrics()

    expect(metrics).toBeDefined()
    expect(metrics!.players).toBe('0')
    expect(metrics!.fps).toBe('N/A')
  })
})
