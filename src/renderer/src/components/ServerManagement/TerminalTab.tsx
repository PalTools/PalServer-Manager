import { useRef, useEffect, useState } from 'react'
import { InstanceConfig, sendRconCommand } from '../../api/instancesApi'

interface Props {
  config: InstanceConfig
  logs: string[]
  isRunning: boolean
}

export default function TerminalTab({ config, logs, isRunning }: Props): React.JSX.Element {
  const logRef = useRef<HTMLDivElement>(null)

  const [rconCmd, setRconCmd] = useState('')
  const [rconLoading, setRconLoading] = useState(false)
  const [cmdHistory, setCmdHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  const rconInputRef = useRef<HTMLInputElement>(null)

  const sendRcon = async (): Promise<void> => {
    if (!rconCmd.trim() || rconLoading) return

    const cmd = rconCmd.trim()
    setCmdHistory((prev) => [...prev, cmd])
    setHistoryIndex(-1)
    setRconCmd('')
    setRconLoading(true)

    try {
      await sendRconCommand(config.id, cmd)
    } catch (err: unknown) {
      console.error('RCON failed:', err)
    } finally {
      setRconLoading(false)
      setTimeout(() => rconInputRef.current?.focus(), 0)
    }
  }

  const handleRconKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (cmdHistory.length > 0) {
        const nextIndex = historyIndex + 1 < cmdHistory.length ? historyIndex + 1 : historyIndex
        setHistoryIndex(nextIndex)
        setRconCmd(cmdHistory[cmdHistory.length - 1 - nextIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1
        setHistoryIndex(nextIndex)
        setRconCmd(cmdHistory[cmdHistory.length - 1 - nextIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setRconCmd('')
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      sendRcon()
    }
  }

  return (
    <div className="tab-pane full-height" style={{ paddingTop: '24px' }}>
      <div className="panel log-panel terminal-view">
        <div className="log-container" ref={logRef}>
          {logs.length === 0 ? (
            <div className="log-line" style={{ color: 'var(--text-muted)' }}>
              Server is offline. No logs to display.
            </div>
          ) : (
            logs.map((line, i) => (
              <div key={i} className="log-line">
                {line}
              </div>
            ))
          )}
        </div>

        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(0,0,0,0.15)',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            borderBottomLeftRadius: '8px',
            borderBottomRightRadius: '8px'
          }}
        >
          <div
            style={{
              color: '#38bdf8',
              fontWeight: 'bold',
              userSelect: 'none',
              fontSize: '13px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            RCON
          </div>
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              ref={rconInputRef}
              type="text"
              className="form-input"
              style={{
                width: '100%',
                fontFamily: 'monospace',
                paddingRight: rconLoading ? '36px' : '12px',
                paddingLeft: '12px',
                background: 'rgba(0,0,0,0.3)',
                borderColor: 'rgba(255,255,255,0.08)',
                height: '36px',
                color: 'var(--text-primary)',
                borderRadius: '8px',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              placeholder={
                isRunning
                  ? 'Enter command (e.g., Info, Save, Broadcast <msg>)...'
                  : 'Server offline'
              }
              disabled={!isRunning}
              value={rconCmd}
              onChange={(e) => setRconCmd(e.target.value)}
              onKeyDown={handleRconKeyDown}
              autoComplete="off"
              spellCheck="false"
            />
            {rconLoading && (
              <span
                className="spinner"
                style={{
                  position: 'absolute',
                  right: '12px',
                  width: '14px',
                  height: '14px',
                  borderWidth: '2px',
                  borderColor: 'rgba(255,255,255,0.2)',
                  borderTopColor: '#38bdf8'
                }}
              />
            )}
          </div>
          <button
            className="btn btn-primary"
            disabled={!isRunning || rconLoading || !rconCmd.trim()}
            onClick={sendRcon}
            style={{
              height: '36px',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 500,
              borderRadius: '8px'
            }}
          >
            Send
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
