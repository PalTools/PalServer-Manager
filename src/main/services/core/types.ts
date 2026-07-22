export interface InstanceSettings {
  publicLobby: boolean
  queryPort: number
  restApiUsername: string
  autoUpdate: boolean
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
  info?: InstanceInfo
  pid?: number
}

export interface InstanceRecord {
  id: string
  path: string
}

export interface RegistryData {
  instances: InstanceRecord[]
  defaultInstanceRoot: string
}

export interface InstanceMetrics {
  players: string
  maxPlayers: string
  fps: string
  frametime: string
  uptimeSec: number
  baseCamps: string
  days: string
}

export interface InstanceInfo {
  version: string
  serverName: string
  description: string
  worldGuid: string
}

export interface InstallProgress {
  stage: string
  percentage: number
}

export interface InstanceStatus {
  id: string
  name: string
  state: 'stopped' | 'running' | 'starting' | 'stopping' | 'installing'
  installProgress?: InstallProgress
  uptime: string
  memory: string
  cpu?: string
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

export interface AppSettings {
  defaultInstanceRoot: string
  dataRoot: string
}

import * as os from 'os'

export const GAME_APP_ID = '2394010'

export const isLinux = os.platform() === 'linux'

export const STEAMCMD_URL = isLinux
  ? 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz'
  : 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip'

export const SERVER_EXE_NAME = isLinux
  ? 'PalServer-Linux-Shipping'
  : 'PalServer-Win64-Shipping-Cmd.exe'
