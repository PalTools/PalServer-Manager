import { useRef, useEffect } from 'react'
import { InstanceConfig, InstanceStatus, openFolder } from '../../api/instancesApi'

interface Props {
  config: InstanceConfig
  status: InstanceStatus | null
  logs: string[]
}

export default function DashboardTab({ config, status, logs }: Props): React.JSX.Element {
  const isRunning = config.state === 'running' || config.state === 'starting'
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div
      data-testid="DashboardTab"
      className="tab-pane"
      style={{
        paddingTop: '24px',
        paddingBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stats-card">
          <div className="stat-label">Status</div>
          <div className={`stat-value ${isRunning ? 'online' : 'offline'}`}>
            {isRunning ? 'Online' : 'Offline'}
          </div>
        </div>
        <div className="stats-card">
          <div className="stat-label">Players</div>
          <div className="stat-value">
            {status?.players || '0'} / {status?.maxPlayers || '32'}
          </div>
        </div>
        <div className="stats-card">
          <div className="stat-label">CPU / Memory Usage</div>
          <div className="stat-value">
            {status?.cpu || '0%'} / {status?.memory || 'N/A'}
          </div>
        </div>
        <div className="stats-card">
          <div className="stat-label">Uptime</div>
          <div className="stat-value">{status?.uptime || 'N/A'}</div>
        </div>
        <div className="stats-card">
          <div className="stat-label">Server FPS</div>
          <div className="stat-value">
            {status?.fps || 'N/A'}
            {status?.frametime && status.frametime !== 'N/A' && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {status.frametime}ms
              </div>
            )}
          </div>
        </div>
        <div className="stats-card">
          <div className="stat-label">Base Camps</div>
          <div className="stat-value">{status?.baseCamps || '0'}</div>
        </div>
        <div className="stats-card">
          <div className="stat-label">In-Game Day</div>
          <div className="stat-value">{status?.days || '0'}</div>
        </div>
        <div className="stats-card" style={{ marginBottom: 0 }}>
          <div className="stat-label">Save Size</div>
          <div className="stat-value">{status?.saveSize || '0 MB'}</div>
        </div>
      </div>

      {/* Info & Logs Preview */}
      <div
        className="detail-panels"
        style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
      >
        <div className="panel">
          <div className="panel-title">Server Information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div className="form-group">
                <label className="form-label">Server Name</label>
                <input className="form-input" value={status?.serverName || 'Offline'} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">Version</label>
                <input className="form-input" value={status?.version || 'Offline'} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-input" value={status?.description || ''} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">World GUID</label>
                <input className="form-input" value={status?.worldGuid || ''} disabled />
              </div>
            </div>
            <div>
              <div className="form-group">
                <label className="form-label">Instance ID</label>
                <input className="form-input" value={config.id} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">Install Path</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="form-input"
                    value={config.installPath}
                    disabled
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-ghost" onClick={() => openFolder(config.installPath)}>
                    Open
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Public Port</label>
                  <input
                    className="form-input"
                    value={String(config.PalworldSettings?.PublicPort || 8211)}
                    disabled
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Query Port</label>
                  <input
                    className="form-input"
                    value={String(config.settings?.queryPort || 27015)}
                    disabled
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">RCON Port</label>
                  <input
                    className="form-input"
                    value={String(config.PalworldSettings?.RCONPort || 25575)}
                    disabled
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">REST API Port</label>
                  <input
                    className="form-input"
                    value={String(config.PalworldSettings?.RESTAPIPort || 8212)}
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="panel log-panel terminal-view"
          style={{ flex: 1, minHeight: 0, marginTop: '24px' }}
        >
          <div className="panel-title">Recent Output</div>
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
        </div>
      </div>
    </div>
  )
}
