import { Socket } from 'net'

export class ClientError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = 'ClientError'
  }
}

export class InvalidPassword extends Error {
  constructor(message?: string) {
    super(message)
    this.name = 'InvalidPassword'
  }
}

export class TimeoutError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

export class BaseRCON {
  public host: string
  public port: number
  public password: string
  public timeout: number
  protected _auth: boolean
  protected _reader: Socket | null
  protected _writer: Socket | null

  constructor(host: string, port: number, password: string, timeout = 15) {
    this.host = host
    this.port = port
    this.password = password
    this.timeout = timeout
    this._auth = false
    this._reader = null
    this._writer = null
  }

  public async connect(): Promise<this> {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = new Socket()
        socket.setTimeout(this.timeout * 1000)

        const onTimeout = (): void => {
          socket.destroy()
          reject(new TimeoutError(`Timeout while connecting to ${this.host}:${this.port}`))
        }

        const onError = (err: Error): void => {
          socket.destroy()
          reject(new ClientError(`Error connecting to ${this.host}:${this.port} - ${err.message}`))
        }

        socket.once('timeout', onTimeout)
        socket.once('error', onError)

        socket.connect(this.port, this.host, () => {
          socket.removeListener('timeout', onTimeout)
          socket.removeListener('error', onError)
          this._reader = socket
          this._writer = socket
          resolve()
        })
      })

      await this._authenticate()
    } catch (e) {
      if (e instanceof TimeoutError || e instanceof ClientError) throw e
      throw new ClientError(`Error connecting to ${this.host}:${this.port} - ${e}`)
    }
    return this
  }

  public async close(): Promise<void> {
    if (this._writer) {
      this._writer.destroy()
      this._writer = null
      this._reader = null
    }
  }

  protected async _authenticate(): Promise<void> {
    if (!this._auth) {
      try {
        await this._send(3, this.password)
        this._auth = true
      } catch (e) {
        throw new InvalidPassword(`Authentication failed - ${e}`)
      }
    }
  }

  protected async _read_data(length: number): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      if (!this._reader) {
        return reject(new ClientError('Not connected.'))
      }

      const socket = this._reader
      const timeoutMs = this.timeout * 1000

      const timer = setTimeout(() => {
        socket.removeListener('readable', onReadable)
        socket.removeListener('close', onClose)
        reject(new TimeoutError('Timeout while reading data from server'))
      }, timeoutMs)

      const onClose = (): void => {
        clearTimeout(timer)
        socket.removeListener('readable', onReadable)
        reject(new ClientError('Socket closed unexpectedly.'))
      }

      const onReadable = (): void => {
        const chunk = socket.read(length)
        if (chunk !== null) {
          clearTimeout(timer)
          socket.removeListener('readable', onReadable)
          socket.removeListener('close', onClose)
          resolve(chunk as Buffer)
        }
      }

      socket.on('readable', onReadable)
      socket.once('close', onClose)

      onReadable()
    })
  }

  protected async _send(typen: number, message: string): Promise<string> {
    if (!this._writer) {
      throw new ClientError('Not connected.')
    }

    const encoded_message = Buffer.from(message, 'utf-8')
    // struct.pack('<li', 0, typen) + encoded_message + b'\x00\x00'
    const outLength = 4 + 4 + encoded_message.length + 2
    const outPayload = Buffer.alloc(outLength)
    outPayload.writeInt32LE(0, 0)
    outPayload.writeInt32LE(typen, 4)
    encoded_message.copy(outPayload, 8)

    const finalBuffer = Buffer.alloc(4 + outLength)
    finalBuffer.writeInt32LE(outLength, 0)
    outPayload.copy(finalBuffer, 4)

    this._writer.write(finalBuffer)

    // in_len = struct.unpack('<i', await self._read_data(4))[0]
    const lenBuf = await this._read_data(4)
    const in_len = lenBuf.readInt32LE(0)

    // in_payload = await self._read_data(in_len)
    const in_payload = await this._read_data(in_len)

    // in_id, _ = struct.unpack('<ii', in_payload[:8])
    const in_id = in_payload.readInt32LE(0)
    // const in_type = in_payload.readInt32LE(4)

    // in_data, in_padd = in_payload[8:-2], in_payload[-2:]
    const in_data = in_payload.subarray(8, in_payload.length - 2)
    const in_padd = in_payload.subarray(in_payload.length - 2)

    if (in_padd[0] !== 0 || in_padd[1] !== 0) {
      throw new ClientError('Incorrect padding.')
    }
    if (in_id === -1) {
      throw new InvalidPassword('Incorrect password.')
    }

    // decode('utf-8', errors='replace')
    return in_data.toString('utf-8')
  }
}

export class GameRCON extends BaseRCON {
  public async send(cmd: string): Promise<string> {
    if (!this._auth) {
      throw new ClientError('Client not authenticated.')
    }
    return await this._send(2, cmd)
  }
}

export class GameRCONBase64 extends BaseRCON {
  public async send(cmd: string): Promise<string> {
    if (!this._auth) {
      throw new ClientError('Client not authenticated.')
    }
    const encoded_cmd = Buffer.from(cmd, 'utf-8').toString('base64')
    const result = await this._send(2, encoded_cmd)
    try {
      return Buffer.from(result, 'base64').toString('utf-8')
    } catch {
      return result
    }
  }
}

export class EvrimaRCON {
  public host: string
  public port: number
  public password: string
  public timeout: number
  public reader: Socket | null = null
  public writer: Socket | null = null

  constructor(host: string, port: number, password: string) {
    this.host = host
    this.port = port
    this.password = password
    this.timeout = 30
  }

  public async connect(): Promise<string> {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = new Socket()
        socket.setTimeout(this.timeout * 1000)

        const onTimeout = (): void => {
          socket.destroy()
          reject(new TimeoutError('Connection timed out'))
        }

        const onError = (e: Error): void => {
          socket.destroy()
          reject(new ClientError(`Socket error: ${e}`))
        }

        socket.once('timeout', onTimeout)
        socket.once('error', onError)

        socket.connect(this.port, this.host, () => {
          socket.removeListener('timeout', onTimeout)
          socket.removeListener('error', onError)
          this.reader = socket
          this.writer = socket
          resolve()
        })
      })

      if (!this.writer || !this.reader) return 'Connection cancelled'

      // payload = bytes('\x01', 'utf-8') + self.password.encode() + bytes('\x00', 'utf-8')
      const payload = Buffer.concat([
        Buffer.from('\x01', 'utf-8'),
        Buffer.from(this.password, 'utf-8'),
        Buffer.from('\x00', 'utf-8')
      ])

      this.writer.write(payload)

      // response = await asyncio.wait_for(self.reader.read(1024), timeout=self.timeout)
      const response = await this._read_up_to()
      if (!response.toString('utf-8').includes('Accepted')) {
        this.writer.destroy()
        return 'Login failed'
      }

      return 'Connected'
    } catch (e) {
      if (e instanceof TimeoutError) return 'Connection timed out'
      return `Socket error: ${e}`
    }
  }

  public async send_command(command_bytes: Buffer): Promise<string> {
    try {
      if (!this.writer || !this.reader) return 'Error sending command: Not connected'
      this.writer.write(command_bytes)
      const response = await this._read_up_to()
      return response.toString('utf-8')
    } catch (e) {
      return `Error sending command: ${e}`
    }
  }

  private _read_up_to(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      if (!this.reader) return reject(new Error('Not connected'))

      const socket = this.reader
      const timeoutMs = this.timeout * 1000

      const timer = setTimeout(() => {
        socket.removeListener('data', onData)
        reject(new TimeoutError('Timeout'))
      }, timeoutMs)

      const onData = (data: Buffer): void => {
        clearTimeout(timer)
        socket.removeListener('data', onData)
        resolve(data)
      }

      socket.once('data', onData)
    })
  }
}
