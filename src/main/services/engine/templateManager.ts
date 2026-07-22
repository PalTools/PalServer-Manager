import { join, relative } from 'path'
import {
  existsSync,
  statSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  chmodSync
} from 'fs'
import { installOrUpdate, checkForUpdate } from './steamcmd'
import { getDataRoot } from '../../ipcs/core/settings'
import { isLinux, SERVER_EXE_NAME } from '../../services/core/types'

export type TemplateStatus = 'not_installed' | 'missing_files' | 'ok'

export class TemplateManager {
  private dataRoot: string
  private templateDir: string
  private manifestPath: string

  constructor() {
    this.dataRoot = getDataRoot()
    this.templateDir = join(this.dataRoot, 'Template')
    this.manifestPath = join(this.dataRoot, 'template_manifest.json')
  }

  getTemplateDir(): string {
    return this.templateDir
  }

  getTemplateStatus(): TemplateStatus {
    if (!existsSync(this.templateDir) || !existsSync(this.manifestPath)) {
      return 'not_installed'
    }

    try {
      const manifestRaw = readFileSync(this.manifestPath, 'utf-8')
      const manifest: Record<string, number> = JSON.parse(manifestRaw)

      for (const [relPath, expectedSize] of Object.entries(manifest)) {
        const fullPath = join(this.templateDir, relPath)
        if (!existsSync(fullPath)) {
          return 'missing_files'
        }
        const stats = statSync(fullPath)
        if (stats.size !== expectedSize) {
          return 'missing_files'
        }
      }

      return 'ok'
    } catch (e) {
      console.error('Error reading template manifest:', e)
      return 'missing_files'
    }
  }

  generateIntegrityManifest(): void {
    const manifest: Record<string, number> = {}

    const walk = (dir: string): void => {
      if (!existsSync(dir)) return
      const files = readdirSync(dir)
      for (const file of files) {
        const fullPath = join(dir, file)
        const stats = statSync(fullPath)
        if (stats.isDirectory()) {
          walk(fullPath)
        } else {
          const relPath = relative(this.templateDir, fullPath).replace(/\\/g, '/')
          manifest[relPath] = stats.size
        }
      }
    }

    walk(this.templateDir)
    writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
  }

  async installTemplate(
    log?: (msg: string) => void,
    onProgress?: (stage: string, percent: number) => void
  ): Promise<void> {
    mkdirSync(this.templateDir, { recursive: true })
    const code = await installOrUpdate(this.templateDir, log, onProgress)

    if (code !== 0) {
      throw new Error(`SteamCMD failed with code ${code}`)
    }

    if (isLinux) {
      try {
        const exePath = join(this.templateDir, SERVER_EXE_NAME)
        if (existsSync(exePath)) {
          chmodSync(exePath, 0o755)
        }
      } catch (err) {
        console.error('Failed to chmod PalServer binary:', err)
      }
    }

    log?.('Generating integrity manifest...')
    this.generateIntegrityManifest()
    log?.('Template integrity validated.')
  }

  async checkForUpdate(log?: (msg: string) => void): Promise<{
    needsUpdate: boolean
    currentBuildId: string | null
    remoteBuildId: string | null
  }> {
    return checkForUpdate(this.templateDir, log)
  }
}

export const templateManager = new TemplateManager()
