import { useState, useEffect, useCallback } from 'react'
import {
  InstanceConfig,
  InstanceStatus,
  listInstances,
  createInstance,
  deleteInstance,
  startInstance,
  stopInstance,
  onInstanceStatus
} from '../api/instancesApi'

interface Props {
  onSelectInstance: (id: string) => void
}

export default function InstanceList({ onSelectInstance }: Props): React.JSX.Element {
  const [instances, setInstances] = useState<InstanceConfig[]>([])
  const [statuses, setStatuses] = useState<Map<string, InstanceStatus>>(new Map())
  const [showCreate, setShowCreate] = useState(false)
  const [showDelete, setShowDelete] = useState<string | null>(null)
  const [deleteFiles, setDeleteFiles] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const [newName, setNewName] = useState('Palworld Server Hosted By PalTools/PalServer-Manager')
  const [newPublicPort, setNewPublicPort] = useState('')
  const [newQueryPort, setNewQueryPort] = useState('')
  const [newRconPort, setNewRconPort] = useState('')
  const [newRestPort, setNewRestPort] = useState('')
  const [newAdminPassword, setNewAdminPassword] = useState('ChangeItToUniquePassword')
  const [newPublicIp, setNewPublicIp] = useState('')
  const [machineIp, setMachineIp] = useState('127.0.0.1')

  useEffect(() => {
    fetch('https://ipv4.icanhazip.com')
      .then((res) => res.text())
      .then((text) => {
        const ip = text.trim()
        setNewPublicIp(ip)
        setMachineIp(ip)
      })
      .catch((err) => console.error('Failed to fetch public IP:', err))
  }, [])

  const refresh = useCallback(async () => {
    const list = await listInstances()
    setInstances(list)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  useEffect(() => {
    const unsub = onInstanceStatus((status: InstanceStatus) => {
      setStatuses((prev) => {
        const next = new Map(prev)
        next.set(status.id, status)
        return next
      })
      setInstances((prev) =>
        prev.map((inst) => (inst.id === status.id ? { ...inst, state: status.state } : inst))
      )
    })
    return unsub
  }, [])
  useEffect(() => {
    const handleClickOutside = (): void => setOpenDropdown(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const handleCreate = async (): Promise<void> => {
    if (!newName.trim()) return
    setLoading('creating')
    try {
      await createInstance({
        name: newName.trim(),
        settings: {
          ...(newQueryPort.trim() ? { queryPort: parseInt(newQueryPort) } : {})
        },
        PalworldSettings: {
          ServerName: newName.trim(),
          ...(newPublicPort.trim() ? { PublicPort: parseInt(newPublicPort) } : {}),
          ...(newRconPort.trim()
            ? { RCONEnabled: true, RCONPort: parseInt(newRconPort) }
            : { RCONEnabled: true }),
          ...(newRestPort.trim()
            ? { RESTAPIEnabled: true, RESTAPIPort: parseInt(newRestPort) }
            : { RESTAPIEnabled: true }),
          ...(newAdminPassword.trim() ? { AdminPassword: newAdminPassword.trim() } : {}),
          PublicIP: newPublicIp.trim() || machineIp
        }
      })
      setShowCreate(false)
      setNewName('Palworld Server Hosted By PalTools/PalServer-Manager')
      setNewPublicPort('')
      setNewQueryPort('')
      setNewRconPort('')
      setNewRestPort('')
      setNewAdminPassword('ChangeItToUniquePassword')
      await refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const cleanMsg = msg.replace(/Error invoking remote method '[^']+':\s*(Error:\s*)?/, '')
      alert(`Failed to create instance:\n\n${cleanMsg}`)
    }
    setLoading(null)
  }

  const handleStart = async (id: string, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    setLoading(id)
    try {
      await startInstance(id)
      await refresh()
    } catch (err) {
      alert(`Failed to start: ${err}`)
    }
    setLoading(null)
  }

  const handleStop = async (id: string, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    setLoading(id)
    try {
      await stopInstance(id)
      await refresh()
    } catch (err) {
      alert(`Failed to stop: ${err}`)
    }
    setLoading(null)
  }

  const handleDelete = async (): Promise<void> => {
    if (!showDelete) return
    setLoading('deleting')
    try {
      await deleteInstance(showDelete, deleteFiles)
      setShowDelete(null)
      setDeleteFiles(false)
      await refresh()
    } catch (err) {
      alert(`Failed to delete: ${err}`)
    }
    setLoading(null)
  }

  const getStatus = (id: string): InstanceStatus | undefined => statuses.get(id)

  if (instances.length === 0 && !showCreate) {
    return (
      <div>
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect>
              <line x1="6" y1="12" x2="10" y2="12"></line>
              <line x1="8" y1="10" x2="8" y2="14"></line>
              <line x1="15" y1="13" x2="15.01" y2="13"></line>
              <line x1="18" y1="11" x2="18.01" y2="11"></line>
            </svg>
          </div>
          <h2>No Server Instances</h2>
          <p>Create your first Palworld dedicated server instance to get started.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Instance
          </button>
        </div>

        {showCreate && renderCreateModal()}
      </div>
    )
  }

  function renderCreateModal(): React.JSX.Element {
    return (
      <div className="modal-overlay" onClick={() => setShowCreate(false)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h3 className="modal-title">Create New Instance</h3>
          <div className="form-group">
            <label className="form-label">Server Name</label>
            <input
              data-testid="input-server-name"
              className="form-input"
              placeholder="My Palworld Server"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '12px'
            }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Public Port</label>
              <input
                className="form-input"
                type="number"
                placeholder="Auto (e.g. 8211)"
                value={newPublicPort}
                onChange={(e) => setNewPublicPort(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Query Port</label>
              <input
                className="form-input"
                type="number"
                placeholder="Auto (e.g. 27015)"
                value={newQueryPort}
                onChange={(e) => setNewQueryPort(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Public IP</label>
              <input
                className="form-input"
                type="text"
                placeholder="Auto"
                value={newPublicIp}
                onChange={(e) => setNewPublicIp(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">RCON Port</label>
              <input
                className="form-input"
                type="number"
                placeholder="Auto (e.g. 25575)"
                value={newRconPort}
                onChange={(e) => setNewRconPort(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">REST API Port</label>
              <input
                className="form-input"
                type="number"
                placeholder="Auto (e.g. 8212)"
                value={newRestPort}
                onChange={(e) => setNewRestPort(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
              <label className="form-label">Admin Password</label>
              <input
                className="form-input"
                type="text"
                placeholder="Required for REST API/RCON"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={!newName.trim() || !newAdminPassword.trim() || loading === 'creating'}
            >
              {loading === 'creating' ? <span className="spinner" /> : null}
              Create
            </button>
          </div>
        </div>
      </div>
    )
  }

  const filteredInstances = instances.filter(
    (inst) =>
      inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inst.PalworldSettings?.ServerName &&
        String(inst.PalworldSettings.ServerName).toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div
      data-testid="InstanceList"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <div
        className="page-header"
        style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}
      >
        <h1 className="page-title" style={{ flexShrink: 0 }}>
          Server Instances
        </h1>

        <div className="search-input-wrapper">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search instances..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowCreate(true)}
          style={{ marginLeft: 'auto' }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Instance
        </button>
      </div>

      <div className="instances-grid" style={{ paddingBottom: '40px' }}>
        {filteredInstances.length === 0 && searchQuery && (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <p>No instances match your search.</p>
          </div>
        )}

        {filteredInstances.map((inst) => {
          const status = getStatus(inst.id)
          const state = status?.state || inst.state
          const isRunning = state === 'running'
          const isStarting = state === 'starting'

          return (
            <div
              key={inst.id}
              className={`instance-card ${state}`}
              onClick={() => onSelectInstance(inst.id)}
              style={{ zIndex: openDropdown === inst.id ? 10 : 1 }}
            >
              <div
                className="instance-card-header"
                style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    alignItems: 'flex-start'
                  }}
                >
                  <span className="instance-card-name">
                    {String(inst.PalworldSettings?.ServerName || inst.name)}
                  </span>
                  <span className={`instance-card-badge ${state}`}>{state}</span>
                </div>
                {inst.PalworldSettings?.ServerName &&
                  inst.PalworldSettings.ServerName !== inst.name && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Folder: {inst.name}
                    </span>
                  )}
              </div>

              <div
                style={{
                  background: 'var(--bg-glass)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '12px',
                  border: '1px solid var(--border)'
                }}
              >
                <div
                  style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}
                >
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      background: 'rgba(0,0,0,0.2)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    {String(inst.PalworldSettings?.PublicIP || machineIp)}:
                    {String(inst.PalworldSettings?.PublicPort || 8211)}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Query: {String(inst.settings?.queryPort || 27015)}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    RCON: {String(inst.PalworldSettings?.RCONPort || 25575)}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    REST: {String(inst.PalworldSettings?.RESTAPIPort || 8212)}
                  </span>
                </div>

                <div style={{ height: '1px', background: 'var(--border)', opacity: 0.5 }} />

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '6px',
                    rowGap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Players
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {isRunning ? `${status?.players || '0'}/${status?.maxPlayers || '32'}` : '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {isRunning ? 'Uptime' : 'Started'}
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {isRunning ? status?.uptime || '—' : status?.lastStarted || '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      CPU / RAM
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {isRunning ? `${status?.cpu || '0%'} / ${status?.memory || '—'}` : '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Save Size
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {status?.saveSize || '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Version
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {status?.version && status.version !== 'Unknown' ? status.version : '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Admin Pass
                    </span>
                    <span
                      style={{
                        color: 'transparent',
                        textShadow: '0 0 6px rgba(255,255,255,0.4)',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        userSelect: 'none',
                        fontWeight: 500
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--text-primary)'
                        e.currentTarget.style.textShadow = 'none'
                        e.currentTarget.style.userSelect = 'text'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'transparent'
                        e.currentTarget.style.textShadow = '0 0 6px rgba(255,255,255,0.4)'
                        e.currentTarget.style.userSelect = 'none'
                      }}
                    >
                      {String(inst.PalworldSettings?.AdminPassword || '(none)')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="instance-card-actions">
                {!isRunning && !isStarting ? (
                  <button
                    data-testid="btn-start"
                    className="btn btn-success btn-sm"
                    style={{ flex: 1 }}
                    onClick={(e) => handleStart(inst.id, e)}
                    disabled={loading === inst.id}
                  >
                    {loading === inst.id ? (
                      <span className="spinner" />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    )}{' '}
                    Start
                  </button>
                ) : (
                  <button
                    data-testid="btn-stop"
                    className="btn btn-danger btn-sm"
                    style={{ flex: 1 }}
                    onClick={(e) => handleStop(inst.id, e)}
                    disabled={loading === inst.id}
                  >
                    {loading === inst.id ? (
                      <span className="spinner" />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      </svg>
                    )}{' '}
                    Stop
                  </button>
                )}

                {isRunning && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '6px 10px' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStop(inst.id, e)
                      setTimeout(() => handleStart(inst.id, e as unknown as React.MouseEvent), 1500)
                    }}
                    disabled={loading === inst.id}
                    title="Restart"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="1 4 1 10 7 10"></polyline>
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                    </svg>
                  </button>
                )}

                <div className="dropdown-container">
                  <button
                    className="btn btn-ghost btn-sm btn-icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenDropdown(openDropdown === inst.id ? null : inst.id)
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="1"></circle>
                      <circle cx="12" cy="5" r="1"></circle>
                      <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                  </button>

                  {openDropdown === inst.id && (
                    <div className="dropdown-menu">
                      <button
                        className="dropdown-item danger"
                        disabled={isRunning || isStarting}
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenDropdown(null)
                          setShowDelete(inst.id)
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Delete Instance
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showCreate && renderCreateModal()}

      {showDelete && (
        <div className="modal-overlay" onClick={() => setShowDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Delete Instance</h3>
            <p className="confirm-text">
              Are you sure you want to delete this instance? This action cannot be undone.
            </p>
            <label className="confirm-checkbox">
              <input
                type="checkbox"
                checked={deleteFiles}
                onChange={(e) => setDeleteFiles(e.target.checked)}
              />
              Also delete server files and saves
            </label>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowDelete(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={loading === 'deleting'}
              >
                {loading === 'deleting' ? <span className="spinner" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
