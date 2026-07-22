import { ipcMain, shell } from 'electron'
import { resolve, dirname, join } from 'path'
import { promises as fs } from 'fs'
import { InstanceManager } from '../../services/server/instanceManager'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as os from 'os'

const execAsync = promisify(exec)

export function resolveSafePath(installPath: string, relPath: string): string {
  const fullPath = resolve(installPath, relPath || '')
  if (!fullPath.toLowerCase().startsWith(installPath.toLowerCase())) {
    throw new Error('Path traversal detected')
  }
  return fullPath
}

export function registerFsHandlers(manager: InstanceManager): void {
  ipcMain.handle('fs:readdir', async (_event, id: string, relPath: string) => {
    const instance = manager.get(id)
    const targetPath = resolveSafePath(instance.installPath, relPath)

    try {
      const entries = await fs.readdir(targetPath, { withFileTypes: true })
      const results = await Promise.all(
        entries.map(async (entry) => {
          const fullEntryPath = resolve(targetPath, entry.name)
          let size = 0
          let mtime = ''

          try {
            const stats = await fs.stat(fullEntryPath)
            size = stats.size
            mtime = stats.mtime.toISOString()
          } catch {
            void 0
          }

          return {
            name: entry.name,
            isDir: entry.isDirectory(),
            size,
            mtime
          }
        })
      )

      results.sort((a, b) => {
        if (a.isDir && !b.isDir) return -1
        if (!a.isDir && b.isDir) return 1
        return a.name.localeCompare(b.name)
      })

      return results
    } catch (err: unknown) {
      if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'ENOENT') {
        return []
      }
      throw err
    }
  })

  ipcMain.handle('fs:readFile', async (_event, id: string, relPath: string) => {
    const instance = manager.get(id)
    const targetPath = resolveSafePath(instance.installPath, relPath)
    const content = await fs.readFile(targetPath, 'utf-8')
    return content
  })

  ipcMain.handle('fs:writeFile', async (_event, id: string, relPath: string, content: string) => {
    const instance = manager.get(id)
    const targetPath = resolveSafePath(instance.installPath, relPath)

    const allowedExts = [
      '.ini',
      '.cfg',
      '.conf',
      '.config',
      '.toml',
      '.yaml',
      '.yml',
      '.env',
      '.properties',
      '.plist',
      '.json',
      '.jsonc',
      '.xml',
      '.csv',
      '.tsv',
      '.txt',
      '.log',
      '.md',
      '.markdown',
      '.rst',
      '.adoc',
      '.sh',
      '.bash',
      '.zsh',
      '.bat',
      '.cmd',
      '.ps1',
      '.js',
      '.ts',
      '.jsx',
      '.tsx',
      '.py',
      '.rb',
      '.go',
      '.rs',
      '.java',
      '.c',
      '.cpp',
      '.h',
      '.hpp',
      '.cs',
      '.php',
      '.lua',
      '.sql',
      '.html',
      '.css',
      '.scss',
      '.less',
      '.dart',
      '.kt',
      '.swift',
      '.gitignore',
      '.editorconfig',
      '.dockerfile',
      '.npmrc',
      '.yarnrc',
      '.LICENSE',
      'LICENSE',
      'README'
    ]

    const filename = targetPath.split(/[/\\]/).pop()?.toLowerCase() || ''
    const isAllowed = allowedExts.some(
      (e) => filename.endsWith(e.toLowerCase()) || filename === e.toLowerCase()
    )

    if (!isAllowed) {
      throw new Error('Only text-based configuration and log files can be edited via the manager.')
    }

    await fs.writeFile(targetPath, content, 'utf-8')
    return { success: true }
  })

  ipcMain.handle('fs:upload', async (_event, id: string, relPath: string, buffer: ArrayBuffer) => {
    const instance = manager.get(id)
    const targetPath = resolveSafePath(instance.installPath, relPath)
    await fs.writeFile(targetPath, Buffer.from(buffer))
    return { success: true }
  })

  ipcMain.handle('fs:openInExplorer', (_event, id: string, relPath: string) => {
    const instance = manager.get(id)
    const targetPath = resolveSafePath(instance.installPath, relPath)
    shell.showItemInFolder(targetPath)
  })

  ipcMain.handle('fs:delete', async (_event, id: string, relPath: string) => {
    const instance = manager.get(id)
    const targetPath = resolveSafePath(instance.installPath, relPath)
    await fs.rm(targetPath, { recursive: true, force: true })
  })

  ipcMain.handle('fs:rename', async (_event, id: string, relPath: string, newName: string) => {
    const instance = manager.get(id)
    const targetPath = resolveSafePath(instance.installPath, relPath)
    if (newName.includes('/') || newName.includes('\\')) throw new Error('Invalid name')
    const newRelPath = join(dirname(relPath), newName)
    const newPath = resolveSafePath(instance.installPath, newRelPath)
    await fs.rename(targetPath, newPath)
  })

  ipcMain.handle('fs:mkdir', async (_event, id: string, relPath: string, name: string) => {
    const instance = manager.get(id)
    if (name.includes('/') || name.includes('\\')) throw new Error('Invalid name')
    const targetRelPath = join(relPath, name)
    const targetPath = resolveSafePath(instance.installPath, targetRelPath)
    await fs.mkdir(targetPath, { recursive: true })
  })

  ipcMain.handle('fs:mkfile', async (_event, id: string, relPath: string, name: string) => {
    const instance = manager.get(id)
    if (name.includes('/') || name.includes('\\')) throw new Error('Invalid name')
    const targetRelPath = join(relPath, name)
    const targetPath = resolveSafePath(instance.installPath, targetRelPath)
    await fs.writeFile(targetPath, '', 'utf-8')
  })

  ipcMain.handle(
    'fs:archive',
    async (_event, id: string, relPaths: string[], archiveName: string) => {
      const instance = manager.get(id)
      if (relPaths.length === 0) return

      const firstRelDir = dirname(relPaths[0])
      const archiveRelPath = join(firstRelDir, archiveName)
      const archivePath = resolveSafePath(instance.installPath, archiveRelPath)

      if (os.platform() === 'win32') {
        const script = `Compress-Archive -Path ${relPaths.map((p) => `"${resolveSafePath(instance.installPath, p)}"`).join(',')} -DestinationPath "${archivePath}" -Force`
        await execAsync(`powershell.exe -NoProfile -Command "${script}"`)
      } else {
        const script = `tar -czf "${archivePath}" -C "${instance.installPath}" ${relPaths.map((p) => `"${p}"`).join(' ')}`
        await execAsync(script)
      }
    }
  )

  ipcMain.handle('fs:unarchive', async (_event, id: string, relPath: string) => {
    const instance = manager.get(id)
    const targetPath = resolveSafePath(instance.installPath, relPath)
    const dir = dirname(targetPath)

    if (os.platform() === 'win32') {
      await execAsync(
        `powershell.exe -NoProfile -Command "Expand-Archive -Path '${targetPath}' -DestinationPath '${dir}' -Force"`
      )
    } else {
      await execAsync(`tar -xzf "${targetPath}" -C "${dir}"`)
    }
  })
}
