import { app } from 'electron'
import { join } from 'path'
import { createWriteStream } from 'fs'

let initialized = false

export function initLogger(): void {
  if (initialized) return
  initialized = true

  const logPath = join(app.getPath('logs'), 'palserver-manager.log')
  const stream = createWriteStream(logPath, { flags: 'a' })

  const originalLog = console.log
  const originalError = console.error
  const originalWarn = console.warn
  const originalInfo = console.info

  const formatMessage = (level: string, args: unknown[]): string => {
    const timestamp = new Date().toISOString()
    const message = args
      .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
      .join(' ')
    return `[${timestamp}] [${level}] ${message}\n`
  }

  console.log = (...args) => {
    stream.write(formatMessage('INFO', args))
    originalLog(...args)
  }

  console.info = (...args) => {
    stream.write(formatMessage('INFO', args))
    originalInfo(...args)
  }

  console.warn = (...args) => {
    stream.write(formatMessage('WARN', args))
    originalWarn(...args)
  }

  console.error = (...args) => {
    stream.write(formatMessage('ERROR', args))
    originalError(...args)
  }

  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err)
  })

  process.on('unhandledRejection', (reason) => {
    console.error('UNHANDLED REJECTION:', reason)
  })
}
