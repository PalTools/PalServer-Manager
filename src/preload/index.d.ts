import { ElectronAPI } from '@electron-toolkit/preload'

interface PalServerManagerAPI {
  listInstances: () => Promise<unknown[]>
  getInstance: (id: string) => Promise<unknown>
  createInstance: (input: unknown) => Promise<unknown>
  updateInstance: (id: string, patch: unknown) => Promise<unknown>
  deleteInstance: (id: string, deleteFiles: boolean) => Promise<unknown>
  getSettingsSchema: () => Promise<unknown>
  openFolder: (path: string) => Promise<void>
  startInstance: (id: string) => Promise<unknown>
  stopInstance: (id: string) => Promise<unknown>
  killInstance: (id: string) => Promise<unknown>
  trimRam: (id: string) => Promise<{ success: boolean; message: string }>
  getLogs: (id: string) => Promise<string[]>
  listDir: (id: string, relPath: string) => Promise<unknown>
  readFile: (id: string, relPath: string) => Promise<string>
  writeFile: (id: string, relPath: string, content: string) => Promise<unknown>
  uploadFile: (id: string, relPath: string, buffer: ArrayBuffer) => Promise<unknown>
  deleteFile: (id: string, relPath: string) => Promise<void>
  renameFile: (id: string, relPath: string, newName: string) => Promise<void>
  mkdir: (id: string, relPath: string, name: string) => Promise<void>
  mkfile: (id: string, relPath: string, name: string) => Promise<void>
  archive: (id: string, relPaths: string[], archiveName: string) => Promise<void>
  unarchive: (id: string, relPath: string) => Promise<void>
  openInExplorer: (id: string, relPath: string) => Promise<void>
  onInstanceStatus: (callback: (status: unknown) => void) => () => void
  onInstanceLog: (callback: (id: string, msg: string) => void) => () => void

  getTemplateStatus: () => Promise<unknown>
  installTemplate: () => Promise<{ success: boolean; error?: string }>
  checkTemplateUpdate: () => Promise<{
    needsUpdate: boolean
    currentBuildId: string | null
    remoteBuildId: string | null
    error?: string
  }>
  updateInstanceFiles: (id: string) => Promise<unknown>

  getPlayers: (id: string) => Promise<unknown[]>
  kickPlayer: (id: string, userId: string, message: string) => Promise<void>
  banPlayer: (id: string, userId: string, message: string) => Promise<void>
  unbanPlayer: (id: string, userId: string) => Promise<void>
  announce: (id: string, message: string) => Promise<void>
}

declare global {
  interface Window {
    electron: ElectronAPI
    palServerManager: PalServerManagerAPI
  }
}
