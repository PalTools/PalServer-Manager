import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GameRCON, TimeoutError } from '../../../src/main/services/server/rconClient'
import net from 'net'
import { EventEmitter } from 'events'

vi.mock('net')

describe('GameRCON (rconClient.ts)', () => {
  let mockSocket: {
    setTimeout: ReturnType<typeof vi.fn>
    destroy: ReturnType<typeof vi.fn>
    connect: ReturnType<typeof vi.fn>
    write: ReturnType<typeof vi.fn>
    read: ReturnType<typeof vi.fn>
    emitData: (chunk: Buffer) => void
    emit: (event: string, ...args: unknown[]) => boolean
  }

  beforeEach(() => {
    mockSocket = new EventEmitter() as unknown as typeof mockSocket
    mockSocket.setTimeout = vi.fn()
    mockSocket.destroy = vi.fn()
    mockSocket.connect = vi
      .fn()
      .mockImplementation((port: number, host: string, cb: () => void) => {
        // Defer the callback to simulate async connection
        setTimeout(cb, 10)
      })
    mockSocket.write = vi.fn()
    let buffer = Buffer.alloc(0)
    mockSocket.read = vi.fn((size?: number) => {
      if (size === undefined) size = buffer.length
      if (buffer.length >= size) {
        const chunk = buffer.subarray(0, size)
        buffer = buffer.subarray(size)
        return chunk
      }
      return null
    })

    // Custom helper to push data to the buffer and trigger readable
    mockSocket.emitData = (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk])
      mockSocket.emit('readable')
    }

    // Mock net.Socket to return our EventEmitter using a constructor-friendly function
    vi.mocked(net.Socket).mockImplementation(function (this: unknown) {
      return mockSocket
    } as unknown as typeof net.Socket)
  })

  // Helper to simulate incoming data chunks
  const simulateIncomingData = (id: number, type: number, body: string): void => {
    const bodyBuf = Buffer.from(body, 'utf-8')
    const payloadLength = 4 + 4 + bodyBuf.length + 2 // id + type + body + 2 nulls
    const outBuf = Buffer.alloc(4 + payloadLength)

    outBuf.writeInt32LE(payloadLength, 0)
    outBuf.writeInt32LE(id, 4)
    outBuf.writeInt32LE(type, 8)
    bodyBuf.copy(outBuf, 12)
    outBuf.writeInt8(0, 12 + bodyBuf.length)
    outBuf.writeInt8(0, 12 + bodyBuf.length + 1)

    mockSocket.emitData(outBuf)
  }

  it('completes auth handshake correctly on connect', async () => {
    const rcon = new GameRCON('127.0.0.1', 25575, 'password')

    // As soon as connect resolves the TCP connection, it sends auth (type 3).
    // We need to respond to the auth packet.
    const connectPromise = rcon.connect()

    // Wait slightly for connect callback to fire and socket.write to be called
    await new Promise((r) => setTimeout(r, 20))

    expect(mockSocket.write).toHaveBeenCalledTimes(1)

    // Respond with successful auth (id matches, not -1)
    simulateIncomingData(1, 2, '') // auth response typically has id=1

    await expect(connectPromise).resolves.toBe(rcon)
  })

  it('throws ClientError wrapping InvalidPassword if auth handshake fails (id = -1)', async () => {
    const rcon = new GameRCON('127.0.0.1', 25575, 'wrongpassword')

    const connectPromise = rcon.connect()
    await new Promise((r) => setTimeout(r, 20))

    // Respond with failed auth (id = -1)
    simulateIncomingData(-1, 2, '')

    await expect(connectPromise).rejects.toThrow(/Incorrect password/)
  })

  it('round-trips a command request/response successfully', async () => {
    const rcon = new GameRCON('127.0.0.1', 25575, 'password')

    const connectPromise = rcon.connect()
    await new Promise((r) => setTimeout(r, 20))
    simulateIncomingData(1, 2, '') // Auth success
    await connectPromise

    mockSocket.write.mockClear()

    const sendPromise = rcon.send('Info')
    await new Promise((r) => setTimeout(r, 20))

    expect(mockSocket.write).toHaveBeenCalledTimes(1)

    simulateIncomingData(2, 0, 'Welcome to Palworld')

    const result = await sendPromise
    expect(result).toBe('Welcome to Palworld')
  })

  it('throws TimeoutError on connect timeout', async () => {
    const rcon = new GameRCON('127.0.0.1', 25575, 'password', 1)

    const connectPromise = rcon.connect()

    // Simulate socket timeout event before connect callback
    mockSocket.emit('timeout')

    await expect(connectPromise).rejects.toThrow(TimeoutError)
    expect(mockSocket.destroy).toHaveBeenCalled()
  })

  it('close() destroys the socket safely', async () => {
    const rcon = new GameRCON('127.0.0.1', 25575, 'password')
    const connectPromise = rcon.connect()
    await new Promise((r) => setTimeout(r, 20))
    simulateIncomingData(1, 2, '') // Auth success
    await connectPromise

    await rcon.close()

    expect(mockSocket.destroy).toHaveBeenCalled()
  })

  it('close() is called correctly by instance.ts even if send throws', async () => {
    // This tests the interaction expected by instance.ts's `sendRconCommand`
    // where the finally block calls close.
    const rcon = new GameRCON('127.0.0.1', 25575, 'password')
    const connectPromise = rcon.connect()
    await new Promise((r) => setTimeout(r, 20))
    simulateIncomingData(1, 2, '') // Auth success
    await connectPromise

    const sendPromise = rcon.send('BadCommand')
    await new Promise((r) => setTimeout(r, 20))

    // Simulate bad padding throwing a generic ClientError
    const outBuf = Buffer.alloc(14)
    outBuf.writeInt32LE(10, 0)
    outBuf.writeInt32LE(1, 4)
    outBuf.writeInt32LE(0, 8)
    outBuf.writeInt8(1, 12) // Bad padding
    outBuf.writeInt8(1, 13) // Bad padding

    // Ensure the promise rejects correctly without hanging
    const rejectPromise = expect(sendPromise).rejects.toThrow(/Incorrect padding/)
    mockSocket.emitData(outBuf)

    await rejectPromise

    // Manually close since sendRconCommand normally does it in finally
    await rcon.close()
    expect(mockSocket.destroy).toHaveBeenCalled()
  })
})
