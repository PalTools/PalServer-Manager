import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { InstanceManager } from '../../../src/main/services/server/instanceManager'
import { existsSync, rmSync, mkdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

// Mock template manager to avoid steamcmd installs
vi.mock('../../../src/main/services/engine/templateManager', () => ({
  templateManager: {
    getTemplateStatus: () => 'ok',
    getTemplateDir: () => __dirname
  }
}))

describe('instance-management - Integration', () => {
  let tempRoot: string
  let manager: InstanceManager

  beforeEach(() => {
    tempRoot = join(tmpdir(), 'palserver-manager-tests-instances', randomUUID())
    mkdirSync(tempRoot, { recursive: true })
    manager = new InstanceManager(tempRoot)
    manager.loadRegistry()
  })

  afterEach(() => {
    if (existsSync(tempRoot)) {
      rmSync(tempRoot, { recursive: true, force: true })
    }
    vi.restoreAllMocks()
  })

  it('should create -> appears in registry -> delete -> removed from registry and disk', async () => {
    const inst = await manager.createInstance({ name: 'Test Server 1' })
    expect(inst).toBeDefined()
    expect(inst.id).toBeDefined()
    expect(inst.name).toBe('Test Server 1')

    await manager.saveRegistry()
    const regData = JSON.parse(readFileSync(join(tempRoot, 'registry.json'), 'utf-8'))
    expect(regData.instances.some((i: Record<string, unknown>) => i.id === inst.id)).toBe(true)

    // Directory should exist
    expect(existsSync(inst.installPath)).toBe(true)

    // Delete
    await manager.deleteInstance(inst.id, true)

    // We must wait for the async save queue to flush before checking the registry
    await manager.saveRegistry()

    const regDataAfter = JSON.parse(readFileSync(join(tempRoot, 'registry.json'), 'utf-8'))
    expect(regDataAfter.instances.some((i: Record<string, unknown>) => i.id === inst.id)).toBe(
      false
    )

    // Directory should NOT exist
    expect(existsSync(inst.installPath)).toBe(false)
  })

  it('should handle concurrent-write serialization queue under Promise.all', async () => {
    // Fire many saves rapidly
    await Promise.all([
      manager.saveRegistry(),
      manager.saveRegistry(),
      manager.saveRegistry(),
      manager.saveRegistry(),
      manager.saveRegistry(),
      manager.saveRegistry()
    ])

    // If it didn't throw and crash, the queue worked.
    expect(existsSync(join(tempRoot, 'registry.json'))).toBe(true)
  })
})
