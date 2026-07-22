export interface PalworldSettingSchema {
  key: string
  displayName?: string
  type:
    | 'String'
    | 'Numeric'
    | 'NumericSigned'
    | 'Floating'
    | 'TrueFalse'
    | 'AlphaDash'
    | 'CrossplayPlatforms'
    | 'DenyTechnologyList'
  defaultValue: string | number | boolean
  category: string
  requiresQuotes: boolean
  hideInUI: boolean
  description?: string
}

export interface PortConfig {
  publicPort: number
  queryPort: number
}

export interface RconConfig {
  enabled: boolean
  port: number | null
}

export interface InstanceSettings {
  publicLobby: boolean
  queryPort: number
  restApiUsername: string
  autoUpdate: boolean
}

export interface RestApiConfig {
  enabled: boolean
  port: number | null
  adminPassword: string | null
  username: string
}

export interface InstanceConfig {
  id: string
  name: string
  createdAt: string
  installPath: string
  settings: InstanceSettings
  limits: Record<string, unknown>
  PalworldSettings: Record<string, string | number | boolean>
  state: 'stopped' | 'running' | 'starting' | 'stopping' | 'installing'
}

export interface InstallProgress {
  stage: string
  percentage: number
}

export interface FileEntry {
  name: string
  isDir: boolean
  size: number
  mtime: string
}

export interface InstanceStatus {
  id: string
  name: string
  state: 'stopped' | 'running' | 'starting' | 'stopping' | 'installing'
  installProgress?: InstallProgress
  uptime: string
  memory: string
  cpu: string
  version: string
  players: string
  maxPlayers: string
  fps: string
  frametime: string
  baseCamps: string
  days: string
  serverName: string
  description: string
  worldGuid: string
  restartIn: string
  saveSize?: string
  lastStarted?: string
}

export interface CreateInstanceInput {
  name: string
  installPath?: string
  settings?: Partial<InstanceSettings>
  PalworldSettings?: Record<string, string | number | boolean>
}

export interface InstancePatch {
  name?: string
  settings?: Partial<InstanceSettings>
  PalworldSettings?: Record<string, string | number | boolean>
}

const api = window.palServerManager

export async function listInstances(): Promise<InstanceConfig[]> {
  return (await api.listInstances()) as InstanceConfig[]
}

export async function getSettingsSchema(): Promise<PalworldSettingSchema[]> {
  return (await api.getSettingsSchema()) as PalworldSettingSchema[]
}

export async function getInstance(id: string): Promise<InstanceConfig> {
  return (await api.getInstance(id)) as InstanceConfig
}

export async function createInstance(input: CreateInstanceInput): Promise<InstanceConfig> {
  const res = await window.electron.ipcRenderer.invoke('instances:create', input)
  if (res && res._ipcError) throw new Error(res._ipcError)
  return res
}

export async function updateInstance(id: string, patch: InstancePatch): Promise<InstanceConfig> {
  const res = await window.electron.ipcRenderer.invoke('instances:update', id, patch)
  if (res && res._ipcError) throw new Error(res._ipcError)
  return res
}

export async function deleteInstance(id: string, deleteFiles: boolean): Promise<void> {
  const res = await window.electron.ipcRenderer.invoke('instances:delete', id, deleteFiles)
  if (res && res._ipcError) throw new Error(res._ipcError)
}

export async function updateInstanceFiles(id: string): Promise<void> {
  const res = await window.electron.ipcRenderer.invoke('instances:updateFiles', id)
  if (res && res._ipcError) throw new Error(res._ipcError)
}

export async function sendRconCommand(id: string, cmd: string): Promise<string> {
  const res = await window.electron.ipcRenderer.invoke('instances:sendRcon', id, cmd)
  if (res && res._ipcError) throw new Error(res._ipcError)
  return res
}

export async function openFolder(path: string): Promise<void> {
  await api.openFolder(path)
}

export async function openInExplorer(id: string, relPath: string): Promise<void> {
  await api.openInExplorer(id, relPath)
}

export async function startInstance(id: string): Promise<InstanceConfig> {
  return (await api.startInstance(id)) as InstanceConfig
}

export async function stopInstance(id: string): Promise<InstanceConfig> {
  return (await api.stopInstance(id)) as InstanceConfig
}

export async function killInstance(id: string): Promise<InstanceConfig> {
  return (await api.killInstance(id)) as InstanceConfig
}

export async function trimRam(id: string): Promise<{ success: boolean; message: string }> {
  const res = await window.electron.ipcRenderer.invoke('control:trimRam', id)
  if (res && res._ipcError) throw new Error(res._ipcError)
  return res
}

export async function getLogs(id: string): Promise<string[]> {
  return api.getLogs(id)
}

export function onInstanceStatus(callback: (status: InstanceStatus) => void): () => void {
  return api.onInstanceStatus(callback as (s: unknown) => void)
}

export function onInstanceLog(callback: (id: string, msg: string) => void): () => void {
  return api.onInstanceLog(callback)
}

export async function listDir(id: string, relPath: string): Promise<FileEntry[]> {
  return (await api.listDir(id, relPath)) as FileEntry[]
}

export async function readFile(id: string, relPath: string): Promise<string> {
  return (await api.readFile(id, relPath)) as string
}

export async function writeFile(id: string, relPath: string, content: string): Promise<void> {
  await api.writeFile(id, relPath, content)
}

export async function uploadFile(id: string, relPath: string, buffer: ArrayBuffer): Promise<void> {
  await api.uploadFile(id, relPath, buffer)
}

export async function deleteFile(id: string, relPath: string): Promise<void> {
  await api.deleteFile(id, relPath)
}

export async function renameFile(id: string, relPath: string, newName: string): Promise<void> {
  await api.renameFile(id, relPath, newName)
}

export async function mkdir(id: string, relPath: string, name: string): Promise<void> {
  await api.mkdir(id, relPath, name)
}

export async function mkfile(id: string, relPath: string, name: string): Promise<void> {
  await api.mkfile(id, relPath, name)
}

export async function archive(id: string, relPaths: string[], archiveName: string): Promise<void> {
  await api.archive(id, relPaths, archiveName)
}

export async function unarchive(id: string, relPath: string): Promise<void> {
  await api.unarchive(id, relPath)
}
