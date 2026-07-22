import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const palServerManager = {
  listInstances: () => ipcRenderer.invoke('instances:list'),
  getInstance: (id: string) => ipcRenderer.invoke('instances:get', id),
  createInstance: (input: unknown) => ipcRenderer.invoke('instances:create', input),
  updateInstance: (id: string, patch: unknown) => ipcRenderer.invoke('instances:update', id, patch),
  deleteInstance: (id: string, deleteFiles: boolean) =>
    ipcRenderer.invoke('instances:delete', id, deleteFiles),
  getSettingsSchema: () => ipcRenderer.invoke('instances:getSettingsSchema'),
  openFolder: (path: string) => ipcRenderer.invoke('system:openFolder', path),

  startInstance: (id: string) => ipcRenderer.invoke('control:start', id),
  stopInstance: (id: string) => ipcRenderer.invoke('control:stop', id),
  killInstance: (id: string) => ipcRenderer.invoke('control:kill', id),
  trimRam: (id: string) => ipcRenderer.invoke('control:trimRam', id),
  getLogs: (id: string) => ipcRenderer.invoke('control:logs', id),
  listDir: (id: string, relPath: string) => ipcRenderer.invoke('fs:readdir', id, relPath),
  readFile: (id: string, relPath: string) => ipcRenderer.invoke('fs:readFile', id, relPath),
  writeFile: (id: string, relPath: string, content: string) =>
    ipcRenderer.invoke('fs:writeFile', id, relPath, content),
  uploadFile: (id: string, relPath: string, buffer: ArrayBuffer) =>
    ipcRenderer.invoke('fs:upload', id, relPath, buffer),
  deleteFile: (id: string, relPath: string) => ipcRenderer.invoke('fs:delete', id, relPath),
  renameFile: (id: string, relPath: string, newName: string) =>
    ipcRenderer.invoke('fs:rename', id, relPath, newName),
  mkdir: (id: string, relPath: string, name: string) =>
    ipcRenderer.invoke('fs:mkdir', id, relPath, name),
  mkfile: (id: string, relPath: string, name: string) =>
    ipcRenderer.invoke('fs:mkfile', id, relPath, name),
  archive: (id: string, relPaths: string[], archiveName: string) =>
    ipcRenderer.invoke('fs:archive', id, relPaths, archiveName),
  unarchive: (id: string, relPath: string) => ipcRenderer.invoke('fs:unarchive', id, relPath),
  openInExplorer: (id: string, relPath: string) =>
    ipcRenderer.invoke('fs:openInExplorer', id, relPath),

  getTemplateStatus: () => ipcRenderer.invoke('template:getStatus'),
  installTemplate: () => ipcRenderer.invoke('template:install'),
  checkTemplateUpdate: () => ipcRenderer.invoke('template:checkForUpdate'),
  updateInstanceFiles: (id: string) => ipcRenderer.invoke('instances:updateFiles', id),
  onTemplateProgress: (callback: (data: { stage: string; percentage: number }) => void) => {
    const handler = (_event: unknown, data: { stage: string; percentage: number }): void =>
      callback(data)
    ipcRenderer.on('template:progress', handler)
    return () => ipcRenderer.removeListener('template:progress', handler)
  },

  getPlayers: (id: string) => ipcRenderer.invoke('players:list', id),
  kickPlayer: (id: string, userId: string, message: string) =>
    ipcRenderer.invoke('players:kick', id, userId, message),
  banPlayer: (id: string, userId: string, message: string) =>
    ipcRenderer.invoke('players:ban', id, userId, message),
  unbanPlayer: (id: string, userId: string) => ipcRenderer.invoke('players:unban', id, userId),
  announce: (id: string, message: string) => ipcRenderer.invoke('players:announce', id, message),

  onInstanceStatus: (callback: (status: unknown) => void) => {
    const handler = (_event: unknown, status: unknown): void => callback(status)
    ipcRenderer.on('instance:status', handler)
    return () => ipcRenderer.removeListener('instance:status', handler)
  },
  onInstanceLog: (callback: (id: string, msg: string) => void) => {
    const handler = (_event: unknown, id: string, msg: string): void => callback(id, msg)
    ipcRenderer.on('instance:log', handler)
    return () => ipcRenderer.removeListener('instance:log', handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('palServerManager', palServerManager)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore: Electron types are not available on window by default
  window.electron = electronAPI
  // @ts-ignore: custom palServerManager API is not available on window by default
  window.palServerManager = palServerManager
}
