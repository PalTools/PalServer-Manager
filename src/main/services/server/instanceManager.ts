import { existsSync, readFileSync, mkdirSync, rmSync, promises as fsPromises } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { ServerInstance } from './instance'
import { RegistryData, CreateInstanceInput, InstancePatch } from '../core/types'
import { allocatePort, collectUsedPorts, validatePortsUnique } from '../system/ports'
import { templateManager } from '../engine/templateManager'

const execFileAsync = promisify(execFile)

export class InstanceManager {
  private instances = new Map<string, ServerInstance>()
  private dataRoot: string
  private defaultInstanceRoot: string
  private saveQueue: Promise<void> = Promise.resolve()

  constructor(dataRoot: string) {
    this.dataRoot = dataRoot
    this.defaultInstanceRoot = join(dataRoot, 'Servers')
    mkdirSync(this.defaultInstanceRoot, { recursive: true })
  }

  private get registryPath(): string {
    return join(this.dataRoot, 'registry.json')
  }

  loadRegistry(): void {
    this.instances.clear()

    if (!existsSync(this.registryPath)) {
      this.saveRegistry()
      return
    }

    try {
      const raw = readFileSync(this.registryPath, 'utf-8')
      const data: RegistryData = JSON.parse(raw)
      this.defaultInstanceRoot = data.defaultInstanceRoot || this.defaultInstanceRoot

      for (const record of data.instances) {
        const jsonPath = join(record.path, 'instance.json')
        if (existsSync(jsonPath)) {
          try {
            const inst = ServerInstance.load(jsonPath)
            if (inst) {
              if (inst.state === 'running' || inst.state === 'starting') {
                inst.state = inst.isRunning() ? 'running' : 'stopped'
                inst.saveConfig()
              }
              this.instances.set(inst.id, inst)
            }
          } catch (err: unknown) {
            console.error(`Failed to load instance at ${record.path}:`, err)
          }
        }
      }
    } catch (err: unknown) {
      console.error('Failed to load registry:', String(err))
    }
  }

  saveRegistry(): Promise<void> {
    const data: RegistryData = {
      instances: Array.from(this.instances.values()).map((inst) => ({
        id: inst.id,
        path: inst.installPath
      })),
      defaultInstanceRoot: this.defaultInstanceRoot
    }
    mkdirSync(this.dataRoot, { recursive: true })
    const jsonStr = JSON.stringify(data, null, 2)
    this.saveQueue = this.saveQueue
      .then(() => fsPromises.writeFile(this.registryPath, jsonStr, 'utf-8'))
      .catch((err: unknown) => {
        console.error('Failed to save registry:', String(err))
      })
    return this.saveQueue
  }

  getInstance(id: string): ServerInstance | undefined {
    return this.instances.get(id)
  }

  async createInstance(input: CreateInstanceInput): Promise<ServerInstance> {
    const id = randomUUID()
    const installPath = input.installPath || join(this.defaultInstanceRoot, id)

    const usedPorts = collectUsedPorts(this.list())
    const publicPort =
      Number(input.PalworldSettings?.PublicPort) || (await allocatePort(8211, usedPorts))
    usedPorts.add(publicPort)
    const queryPort = input.settings?.queryPort ?? (await allocatePort(27015, usedPorts))
    usedPorts.add(queryPort)

    const rconPort =
      Number(input.PalworldSettings?.RCONPort) || (await allocatePort(25575, usedPorts))
    usedPorts.add(rconPort)
    const restPort =
      Number(input.PalworldSettings?.RESTAPIPort) || (await allocatePort(8212, usedPorts))
    usedPorts.add(restPort)

    const err = validatePortsUnique(this.list(), { queryPort, publicPort, rconPort, restPort })
    if (err) throw new Error(err)

    const instance = ServerInstance.create(input, installPath, queryPort, id)
    instance.PalworldSettings.PublicPort = publicPort
    instance.PalworldSettings.RCONEnabled = true
    instance.PalworldSettings.RCONPort = rconPort
    instance.PalworldSettings.RESTAPIEnabled = true
    instance.PalworldSettings.RESTAPIPort = restPort

    const templateStatus = templateManager.getTemplateStatus()
    if (templateStatus !== 'ok') {
      throw new Error(
        `Cannot create instance: Template is not installed or has missing files (${templateStatus}). Please fix the Engine Template first.`
      )
    }

    try {
      mkdirSync(installPath, { recursive: true })

      if (process.platform !== 'win32') {
        await execFileAsync('cp', [
          '-a',
          `${templateManager.getTemplateDir()}/.`,
          `${installPath}/`
        ])
      } else {
        await execFileAsync(
          'xcopy',
          ['/E', '/I', '/H', '/Y', '/Q', templateManager.getTemplateDir(), installPath],
          { windowsHide: true }
        )
      }
    } catch (err: unknown) {
      throw new Error(
        `Failed to copy server template: ${err instanceof Error ? err.message : String(err)}`
      )
    }

    instance.saveConfig()

    this.instances.set(instance.id, instance)
    this.saveRegistry()

    return instance
  }

  deleteInstance(id: string, deleteFiles: boolean): void {
    const inst = this.instances.get(id)
    if (!inst) throw new Error(`Instance ${id} not found`)

    if (inst.state === 'installing') {
      throw new Error('Cannot delete an instance while it is installing or updating.')
    }

    if (inst.isRunning()) {
      inst.kill()
    }

    if (deleteFiles) {
      try {
        rmSync(inst.installPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 })
      } catch (err: unknown) {
        console.error(`Failed to delete instance files at ${inst.installPath}:`, err)
        throw new Error(
          `Failed to delete files. They might be locked by another process: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    this.instances.delete(id)
    this.saveRegistry()
  }

  updateInstance(id: string, patch: InstancePatch): ServerInstance {
    const inst = this.instances.get(id)
    if (!inst) throw new Error(`Instance ${id} not found`)

    if (patch.name !== undefined) inst.name = patch.name

    let newQueryPort = inst.settings.queryPort
    if (patch.settings?.queryPort) {
      newQueryPort = patch.settings.queryPort
    }

    let newPublicPort = Number(inst.PalworldSettings.PublicPort) || 8211
    if (patch.PalworldSettings?.PublicPort) {
      newPublicPort = Number(patch.PalworldSettings.PublicPort)
    }

    let newRconPort = Number(inst.PalworldSettings.RCONPort) || 25575
    if (patch.PalworldSettings?.RCONPort) {
      newRconPort = Number(patch.PalworldSettings.RCONPort)
    }
    let newRestPort = Number(inst.PalworldSettings.RESTAPIPort) || 8212
    if (patch.PalworldSettings?.RESTAPIPort) {
      newRestPort = Number(patch.PalworldSettings.RESTAPIPort)
    }

    const err = validatePortsUnique(
      this.list(),
      {
        queryPort: newQueryPort,
        publicPort: newPublicPort,
        rconPort: newRconPort,
        restPort: newRestPort
      },
      id
    )
    if (err) throw new Error(err)

    if (patch.settings) {
      inst.settings = { ...inst.settings, ...patch.settings }
    }
    if (patch.PalworldSettings) {
      inst.PalworldSettings = { ...inst.PalworldSettings, ...patch.PalworldSettings }
    }

    inst.saveConfig()
    this.saveRegistry()
    return inst
  }

  get(id: string): ServerInstance {
    const inst = this.instances.get(id)
    if (!inst) throw new Error(`Instance ${id} not found`)
    return inst
  }

  list(): ServerInstance[] {
    return Array.from(this.instances.values())
  }

  async stopAll(): Promise<void> {
    const running = this.list().filter((i) => i.isRunning())
    await Promise.all(running.map((i) => i.stop()))
  }
}
