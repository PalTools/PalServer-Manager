export interface ServerInfoResponse {
  version: string
  servername: string
  description: string
  worldguid: string
}

export interface PlayerInfo {
  name: string
  playerId: string
  userId: string
  ip: string
  ping: number
  location_x: number
  location_y: number
  level: number
}

export interface PlayersResponse {
  players: PlayerInfo[]
}

export interface MetricsResponse {
  serverfps: number
  currentplayernum: number
  serverframetime: number
  maxplayernum: number
  uptime: number
  days: number
  basecampnum: number
}

export interface SettingsResponse {
  [key: string]: string | number | boolean
}

export interface KickRequest {
  userid: string
  message: string
}

export interface BanRequest {
  userid: string
  message: string
}

export interface UnbanRequest {
  userid: string
}

export interface AnnounceRequest {
  message: string
}

export interface ShutdownRequest {
  waittime: number
  message: string
}

export class PalworldApi {
  private readonly baseUrl: string
  private readonly authHeader: string

  constructor(port: number, adminPassword: string) {
    this.baseUrl = `http://127.0.0.1:${port}/v1/api`
    this.authHeader = 'Basic ' + Buffer.from(`admin:${adminPassword}`).toString('base64')
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...options?.headers
        },
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`Palworld API error: ${response.status} ${response.statusText}`)
      }

      const text = await response.text()
      if (!text.trim()) return {} as T
      return JSON.parse(text) as T
    } finally {
      clearTimeout(timeout)
    }
  }

  async info(): Promise<ServerInfoResponse> {
    return this.fetch<ServerInfoResponse>('/info')
  }

  async players(): Promise<PlayersResponse> {
    return this.fetch<PlayersResponse>('/players')
  }

  async metrics(): Promise<MetricsResponse> {
    return this.fetch<MetricsResponse>('/metrics')
  }

  async settings(): Promise<SettingsResponse> {
    return this.fetch<SettingsResponse>('/settings')
  }

  async save(): Promise<void> {
    await this.fetch<void>('/save', { method: 'POST' })
  }

  async broadcast(message: string): Promise<void> {
    await this.fetch<void>('/announce', {
      method: 'POST',
      body: JSON.stringify({ message } as AnnounceRequest)
    })
  }

  async kick(userid: string, message: string): Promise<void> {
    await this.fetch<void>('/kick', {
      method: 'POST',
      body: JSON.stringify({ userid, message } as KickRequest)
    })
  }

  async ban(userid: string, message: string): Promise<void> {
    await this.fetch<void>('/ban', {
      method: 'POST',
      body: JSON.stringify({ userid, message } as BanRequest)
    })
  }

  async unban(userid: string): Promise<void> {
    await this.fetch<void>('/unban', {
      method: 'POST',
      body: JSON.stringify({ userid } as UnbanRequest)
    })
  }

  async shutdown(waittime: number, message: string): Promise<void> {
    await this.fetch<void>('/shutdown', {
      method: 'POST',
      body: JSON.stringify({ waittime, message } as ShutdownRequest)
    })
  }

  async stop(): Promise<void> {
    await this.fetch<void>('/stop', { method: 'POST' })
  }
}
