import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  PersistedPlayer,
  getPlayers,
  kickPlayer,
  banPlayer,
  unbanPlayer,
  announce
} from '../../api/playersApi'

interface Props {
  instanceId: string
  isRunning: boolean
}

function formatPlayTime(seconds: number): string {
  if (!seconds) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDate(ts: number): string {
  if (!ts) return 'Never'
  const d = new Date(ts)
  return d.toLocaleString()
}

const CopyableField = ({ value }: { value: string }): React.JSX.Element => {
  const [copied, setCopied] = useState(false)
  const handleCopy = (): void => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <span
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Click to copy'}
      style={{
        cursor: 'pointer',
        borderBottom: '1px dashed rgba(255,255,255,0.3)',
        color: copied ? '#22c55e' : 'inherit',
        transition: 'color 0.2s',
        whiteSpace: 'nowrap'
      }}
    >
      {value}
    </span>
  )
}

type SortField = 'name' | 'level' | 'lastPing' | 'playTimeSeconds' | 'lastSeen' | null
type SortDirection = 'asc' | 'desc' | null

export default function PlayerManagementTab({ instanceId, isRunning }: Props): React.JSX.Element {
  const [players, setPlayers] = useState<PersistedPlayer[]>([])
  const [announceMsg, setAnnounceMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'players' | 'banned'>('players')
  const [searchQuery, setSearchQuery] = useState('')

  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  const handleSort = (field: NonNullable<SortField>): void => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc')
      else if (sortDirection === 'desc') {
        setSortField(null)
        setSortDirection(null)
      } else setSortDirection('asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const renderSortIndicator = (field: NonNullable<SortField>): React.ReactNode => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? ' ↑' : ' ↓'
  }

  // Modals
  const [confirmAction, setConfirmAction] = useState<{
    type: 'kick' | 'ban' | 'unban'
    userId: string
    name: string
    playerData?: PersistedPlayer
  } | null>(null)
  const [actionReason, setActionReason] = useState('')

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    player: PersistedPlayer
    type: 'active' | 'banned'
  } | null>(null)

  useEffect(() => {
    const handleClick = (): void => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  const fetchPlayers = useCallback(async () => {
    try {
      const data = await getPlayers(instanceId)
      setPlayers(data)
    } catch (e) {
      console.error('Failed to fetch players:', e)
    }
  }, [instanceId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPlayers()
    const interval = setInterval(fetchPlayers, 5000)
    return () => clearInterval(interval)
  }, [fetchPlayers])

  const handleAnnounce = async (): Promise<void> => {
    if (!announceMsg.trim() || !isRunning) return
    setLoading(true)
    try {
      await announce(instanceId, announceMsg)
      setAnnounceMsg('')
    } catch (e) {
      alert(`Failed to announce: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  const confirmSubmit = async (): Promise<void> => {
    if (!confirmAction) return
    const { type, userId } = confirmAction
    setLoading(true)
    try {
      if (type === 'kick') {
        await kickPlayer(instanceId, userId, actionReason || 'Kicked by Admin')
      } else if (type === 'ban') {
        await banPlayer(instanceId, userId, actionReason || 'Banned by Admin')
      } else if (type === 'unban') {
        await unbanPlayer(instanceId, userId)
      }
      setConfirmAction(null)
      setActionReason('')
      await fetchPlayers()
    } catch (e) {
      alert(`Failed to ${type} player: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  const filteredPlayers = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return players.filter((p) => {
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.userId.toLowerCase().includes(q) ||
        (p.playerId && p.playerId.toLowerCase().includes(q)) ||
        (p.lastIp && p.lastIp.toLowerCase().includes(q)) ||
        p.level.toString() === q
      )
    })
  }, [players, searchQuery])

  const activePlayers = filteredPlayers
    .filter((p) => p.status !== 'banned')
    .sort((a, b) => {
      if (sortField && sortDirection) {
        const valA = a[sortField]
        const valB = b[sortField]

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
        }

        return sortDirection === 'asc'
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number)
      }

      if (a.status === 'online' && b.status !== 'online') return -1
      if (b.status === 'online' && a.status !== 'online') return 1
      return b.lastSeen - a.lastSeen
    })
  const bannedPlayers = filteredPlayers
    .filter((p) => p.status === 'banned')
    .sort((a, b) => {
      if (sortField && sortDirection) {
        const valA = a[sortField]
        const valB = b[sortField]

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
        }

        return sortDirection === 'asc'
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number)
      }

      return b.lastSeen - a.lastSeen
    })

  return (
    <div className="tab-pane active full-height" style={{ padding: '24px', gap: '24px' }}>
      {/* Top Tab Switcher and Search */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <div style={{ display: 'flex', gap: '24px' }}>
          <div
            style={{
              paddingBottom: '8px',
              cursor: 'pointer',
              color: activeTab === 'players' ? '#00d68f' : 'var(--text-muted)',
              borderBottom: activeTab === 'players' ? '2px solid #00d68f' : '2px solid transparent',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              fontSize: '15px'
            }}
            onClick={() => setActiveTab('players')}
          >
            Players
          </div>
          <div
            style={{
              paddingBottom: '8px',
              cursor: 'pointer',
              color: activeTab === 'banned' ? '#00d68f' : 'var(--text-muted)',
              borderBottom: activeTab === 'banned' ? '2px solid #00d68f' : '2px solid transparent',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              fontSize: '15px'
            }}
            onClick={() => setActiveTab('banned')}
          >
            Banned Players
          </div>
        </div>
        <div style={{ paddingBottom: '8px' }}>
          <input
            type="text"
            className="input form-input"
            style={{ width: '250px', padding: '6px 12px' }}
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {activeTab === 'players' && (
        <>
          {/* Broadcast Panel */}
          <div className="panel" style={{ padding: '20px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                className="input form-input"
                style={{ flex: 1 }}
                placeholder="Broadcast a message to the server..."
                value={announceMsg}
                onChange={(e) => setAnnounceMsg(e.target.value)}
                disabled={!isRunning || loading}
              />
              <button
                className="btn btn-primary"
                onClick={handleAnnounce}
                disabled={!announceMsg.trim() || !isRunning || loading}
              >
                Announce
              </button>
            </div>
          </div>

          {/* Active Players Panel */}
          <div
            className="panel"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
              borderRadius: '12px',
              minHeight: 0
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '18px',
                color: 'var(--text-primary)',
                marginBottom: '16px',
                flexShrink: 0
              }}
            >
              Players ({activePlayers.length})
            </h2>
            <div style={{ overflowY: 'auto', overflowX: 'auto', flex: 1, paddingRight: '8px' }}>
              <table
                className="table"
                style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}
              >
                <thead
                  style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#1a2231' }}
                >
                  <tr>
                    <th
                      style={{
                        width: '100px',
                        textAlign: 'left',
                        padding: '12px 16px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Status
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        whiteSpace: 'nowrap'
                      }}
                      onClick={() => handleSort('name')}
                    >
                      Name{renderSortIndicator('name')}
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      Player ID
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      User ID
                    </th>
                    <th
                      style={{
                        width: '80px',
                        textAlign: 'left',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        whiteSpace: 'nowrap'
                      }}
                      onClick={() => handleSort('level')}
                    >
                      Level{renderSortIndicator('level')}
                    </th>
                    <th
                      style={{
                        width: '100px',
                        textAlign: 'left',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        whiteSpace: 'nowrap'
                      }}
                      onClick={() => handleSort('lastPing')}
                    >
                      Ping{renderSortIndicator('lastPing')}
                    </th>
                    <th
                      style={{
                        width: '120px',
                        textAlign: 'left',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        whiteSpace: 'nowrap'
                      }}
                      onClick={() => handleSort('playTimeSeconds')}
                    >
                      Play Time{renderSortIndicator('playTimeSeconds')}
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      Location
                    </th>
                    <th
                      style={{
                        width: '150px',
                        textAlign: 'left',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        whiteSpace: 'nowrap'
                      }}
                      onClick={() => handleSort('lastSeen')}
                    >
                      Last Seen{renderSortIndicator('lastSeen')}
                    </th>
                    <th style={{ textAlign: 'right', padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activePlayers.map((p) => (
                    <tr
                      key={p.userId}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        cursor: 'context-menu'
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        setContextMenu({ x: e.clientX, y: e.clientY, player: p, type: 'active' })
                      }}
                    >
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: p.status === 'online' ? '#22c55e' : '#64748b',
                            marginRight: '8px'
                          }}
                        />
                        {p.status === 'online' ? 'Online' : 'Offline'}
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>{p.name}</td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        {p.playerId ? <CopyableField value={p.playerId} /> : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        {p.userId ? <CopyableField value={p.userId} /> : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        {p.level > 0 ? p.level : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        {p.status === 'online' ? `${Math.round(p.lastPing)}ms` : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        {formatPlayTime(p.playTimeSeconds)}
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          whiteSpace: 'nowrap',
                          fontFamily: 'monospace'
                        }}
                      >
                        {p.location_x != null && p.location_y != null ? (
                          <CopyableField
                            value={`${Math.round(p.location_x)} ${Math.round(p.location_y)}`}
                          />
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        {p.status === 'online' ? 'Now' : formatDate(p.lastSeen)}
                      </td>
                      <td
                        style={{ textAlign: 'right', padding: '12px 16px', whiteSpace: 'nowrap' }}
                      >
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '4px 8px', marginRight: '5px' }}
                          disabled={!isRunning || p.status !== 'online'}
                          onClick={() =>
                            setConfirmAction({
                              type: 'kick',
                              userId: p.userId,
                              name: p.name,
                              playerData: p
                            })
                          }
                        >
                          Kick
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '4px 8px' }}
                          disabled={!isRunning}
                          onClick={() =>
                            setConfirmAction({
                              type: 'ban',
                              userId: p.userId,
                              name: p.name,
                              playerData: p
                            })
                          }
                        >
                          Ban
                        </button>
                      </td>
                    </tr>
                  ))}
                  {activePlayers.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}
                      >
                        No players found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'banned' && (
        <div
          className="panel"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
            borderRadius: '12px',
            minHeight: 0
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              color: 'var(--danger-color)',
              marginBottom: '16px',
              flexShrink: 0
            }}
          >
            Banned Players ({bannedPlayers.length})
          </h2>
          <div style={{ overflowY: 'auto', overflowX: 'auto', flex: 1, paddingRight: '8px' }}>
            <table
              className="table"
              style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}
            >
              <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#1a2231' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    User ID
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    Player ID
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      whiteSpace: 'nowrap'
                    }}
                    onClick={() => handleSort('name')}
                  >
                    Name{renderSortIndicator('name')}
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      whiteSpace: 'nowrap'
                    }}
                    onClick={() => handleSort('level')}
                  >
                    Level{renderSortIndicator('level')}
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    Reason
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      whiteSpace: 'nowrap'
                    }}
                    onClick={() => handleSort('lastSeen')}
                  >
                    Banned Date{renderSortIndicator('lastSeen')}
                  </th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {bannedPlayers.map((p) => (
                  <tr
                    key={p.userId}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'context-menu'
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setContextMenu({ x: e.clientX, y: e.clientY, player: p, type: 'banned' })
                    }}
                  >
                    <td
                      style={{
                        fontFamily: 'monospace',
                        padding: '12px 16px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {p.userId ? <CopyableField value={p.userId} /> : '-'}
                    </td>
                    <td
                      style={{
                        fontFamily: 'monospace',
                        padding: '12px 16px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {p.playerId ? <CopyableField value={p.playerId} /> : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>{p.name}</td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {p.level > 0 ? p.level : '-'}
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        maxWidth: '200px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      title={p.reason}
                    >
                      {p.reason || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {formatDate(p.lastSeen)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '4px 8px' }}
                        disabled={!isRunning}
                        onClick={() =>
                          setConfirmAction({
                            type: 'unban',
                            userId: p.userId,
                            name: p.name,
                            playerData: p
                          })
                        }
                      >
                        Unban
                      </button>
                    </td>
                  </tr>
                ))}
                {bannedPlayers.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}
                    >
                      No banned players.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title" style={{ textTransform: 'capitalize' }}>
              {confirmAction.type} Player
            </h2>
            <p className="confirm-text">
              Are you sure you want to {confirmAction.type} <strong>{confirmAction.name}</strong>?
            </p>
            {confirmAction.type === 'unban' && confirmAction.playerData && (
              <div
                style={{
                  marginTop: '15px',
                  padding: '12px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '6px',
                  fontSize: '13px'
                }}
              >
                <div style={{ marginBottom: '4px' }}>
                  <strong>User ID:</strong>{' '}
                  <span style={{ fontFamily: 'monospace' }}>{confirmAction.playerData.userId}</span>
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Last IP:</strong> {confirmAction.playerData.lastIp || '-'}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Level:</strong> {confirmAction.playerData.level || '-'}
                </div>
                <div>
                  <strong>Reason:</strong> {confirmAction.playerData.reason || '-'}
                </div>
              </div>
            )}
            {confirmAction.type !== 'unban' && (
              <input
                type="text"
                className="input form-input"
                style={{ width: '100%', marginTop: '15px' }}
                placeholder="Reason (Optional)"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
              />
            )}
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button
                className="btn btn-ghost"
                onClick={() => setConfirmAction(null)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className={`btn ${confirmAction.type === 'unban' ? 'btn-primary' : 'btn-danger'}`}
                onClick={confirmSubmit}
                disabled={loading}
              >
                {loading ? 'Processing...' : `Confirm ${confirmAction.type}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '8px 0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: 1000,
            minWidth: '150px',
            backdropFilter: 'blur(24px)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: '4px 16px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: '4px',
              paddingBottom: '8px',
              wordBreak: 'break-all'
            }}
          >
            {contextMenu.player.name}
          </div>
          {contextMenu.type === 'active' && (
            <>
              <button
                className="context-menu-item"
                disabled={!isRunning || contextMenu.player.status !== 'online'}
                onClick={() => {
                  setContextMenu(null)
                  setConfirmAction({
                    type: 'kick',
                    userId: contextMenu.player.userId,
                    name: contextMenu.player.name,
                    playerData: contextMenu.player
                  })
                }}
              >
                Kick Player
              </button>
              <button
                className="context-menu-item"
                style={{ color: 'var(--danger-color)' }}
                disabled={!isRunning}
                onClick={() => {
                  setContextMenu(null)
                  setConfirmAction({
                    type: 'ban',
                    userId: contextMenu.player.userId,
                    name: contextMenu.player.name,
                    playerData: contextMenu.player
                  })
                }}
              >
                Ban Player
              </button>
            </>
          )}
          {contextMenu.type === 'banned' && (
            <button
              className="context-menu-item"
              style={{ color: 'var(--primary-color)' }}
              disabled={!isRunning}
              onClick={() => {
                setContextMenu(null)
                setConfirmAction({
                  type: 'unban',
                  userId: contextMenu.player.userId,
                  name: contextMenu.player.name,
                  playerData: contextMenu.player
                })
              }}
            >
              Unban Player
            </button>
          )}
        </div>
      )}
    </div>
  )
}
