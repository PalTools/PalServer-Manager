import { useState, useEffect, useCallback } from 'react'
import {
  InstanceConfig,
  InstanceStatus,
  getInstance,
  updateInstance,
  startInstance,
  stopInstance,
  killInstance,
  trimRam,
  getLogs,
  onInstanceStatus,
  onInstanceLog,
  InstancePatch
} from '../api/instancesApi'

import ConfirmModal from '../components/Shared/ConfirmModal'
import DashboardTab from '../components/ServerManagement/DashboardTab'
import TerminalTab from '../components/ServerManagement/TerminalTab'
import ConfigurationTab from '../components/ServerManagement/ConfigurationTab'
import FileManagerTab from '../components/ServerManagement/FileManagerTab'
import PlayerManagementTab from '../components/ServerManagement/PlayerManagementTab'
import ScheduleManagerTab from '../components/ServerManagement/ScheduleManagerTab'
import LogViewerTab from '../components/ServerManagement/LogViewerTab'
import InstallScreen from '../components/Shared/InstallScreen'

interface Props {
  instanceId: string
  activeTab: string
}

export default function InstanceDetail({ instanceId, activeTab }: Props): React.JSX.Element {
  const [config, setConfig] = useState<InstanceConfig | null>(null)
  const [status, setStatus] = useState<InstanceStatus | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [isTrimming, setIsTrimming] = useState(false)

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean
    action: 'stop' | 'restart' | 'kill' | null
    title: string
    message: string
    confirmStyle: 'danger' | 'primary' | 'success'
  }>({
    isOpen: false,
    action: null,
    title: '',
    message: '',
    confirmStyle: 'danger'
  })

  const loadConfig = useCallback(async () => {
    const cfg = (await getInstance(instanceId)) as InstanceConfig
    setConfig(cfg)
  }, [instanceId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConfig()
    getLogs(instanceId).then(setLogs)
  }, [instanceId, loadConfig])

  useEffect(() => {
    const unsub = onInstanceStatus((s: unknown) => {
      const st = s as InstanceStatus
      if (st.id === instanceId) {
        setStatus(st)
        setConfig((prev) => (prev ? { ...prev, state: st.state } : prev))
      }
    })
    return unsub
  }, [instanceId])

  useEffect(() => {
    const unsub = onInstanceLog((id: string, msg: string) => {
      if (id === instanceId) {
        setLogs((prev) => [...prev.slice(-499), msg])
      }
    })
    return unsub
  }, [instanceId])

  const handleStart = async (): Promise<void> => {
    setLoading('start')
    try {
      await startInstance(instanceId)
      await loadConfig()
    } catch (err) {
      alert(`Failed to start: ${err}`)
    }
    setLoading(null)
  }

  const handleStop = async (): Promise<void> => {
    setLoading('stop')
    try {
      await stopInstance(instanceId)
      await loadConfig()
    } catch (err) {
      alert(`Failed to stop: ${err}`)
    }
    setLoading(null)
  }

  const handleKill = async (): Promise<void> => {
    setLoading('kill')
    try {
      await killInstance(instanceId)
      await loadConfig()
    } catch (err) {
      alert(`Failed to kill: ${err}`)
    }
    setLoading(null)
  }

  const handleRestart = async (): Promise<void> => {
    setLoading('restart')
    try {
      await stopInstance(instanceId)
      await startInstance(instanceId)
      await loadConfig()
    } catch (err) {
      alert(`Failed to restart: ${err}`)
    }
    setLoading(null)
  }

  const handleTrimRam = async (): Promise<void> => {
    setIsTrimming(true)
    try {
      await trimRam(instanceId)
    } catch (e) {
      console.error('Failed to trim RAM', e)
      alert(`Failed to trim RAM: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setIsTrimming(false)
    }
  }

  const handleAction = (action: 'stop' | 'restart' | 'kill'): void => {
    let title = `${action.charAt(0).toUpperCase() + action.slice(1)} Server`
    let msg = `Are you sure you want to ${action} the server?`
    let style: 'danger' | 'primary' | 'success' = 'danger'

    if (action === 'kill') {
      title = 'Kill Server Process'
      msg =
        'Are you sure you want to KILL the server? A save will be attempted, but if it fails, unsaved progress will be lost.'
    } else if (action === 'restart') {
      style = 'primary'
      msg = `Are you sure you want to restart the server? A save will be attempted first.`
    } else {
      msg = `Are you sure you want to stop the server? A save will be attempted first.`
    }

    setConfirmState({ isOpen: true, action, title, message: msg, confirmStyle: style })
  }

  const onConfirmAction = (): void => {
    if (confirmState.action === 'stop') handleStop()
    if (confirmState.action === 'restart') handleRestart()
    if (confirmState.action === 'kill') handleKill()
    setConfirmState((prev) => ({ ...prev, isOpen: false }))
  }

  const handleSaveSettings = async (patch: InstancePatch): Promise<void> => {
    setLoading('save')
    try {
      await updateInstance(instanceId, patch)
      await loadConfig()
    } catch (err) {
      alert(`Failed to save: ${err}`)
    }
    setLoading(null)
  }

  if (!config) {
    return (
      <div className="empty-state">
        <div className="spinner" />
      </div>
    )
  }

  const isRunning = config.state === 'running' || config.state === 'starting'

  if (config.state === 'installing' || status?.state === 'installing') {
    return <InstallScreen progress={status?.installProgress} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        className="detail-header"
        style={{
          padding: '24px 24px 16px',
          borderBottom: '1px solid var(--panel-border)',
          flexShrink: 0,
          marginBottom: 0
        }}
      >
        <h1 className="detail-title" style={{ margin: 0 }}>
          {config.name}
        </h1>
        <div className="detail-actions" style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-success"
            onClick={handleStart}
            disabled={isRunning || loading !== null}
          >
            {loading === 'start' ? (
              <span className="spinner" />
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}{' '}
            START
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleAction('restart')}
            disabled={!isRunning || loading !== null}
          >
            {loading === 'restart' ? (
              <span className="spinner" />
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
            )}{' '}
            RESTART
          </button>
          <button
            className="btn btn-ghost"
            onClick={handleTrimRam}
            disabled={!isRunning || isTrimming}
            title="Force Windows to trim the RAM working set"
          >
            {isTrimming ? (
              <span className="spinner" />
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z" />
              </svg>
            )}{' '}
            {isTrimming ? 'FREEING...' : 'FREE MEMORY'}
          </button>
          <button
            className="btn btn-danger"
            onClick={() => handleAction('stop')}
            disabled={!isRunning || loading !== null}
          >
            {loading === 'stop' ? (
              <span className="spinner" />
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M6 6h12v12H6z" />
              </svg>
            )}{' '}
            STOP
          </button>
          <button
            className="btn btn-danger"
            onClick={() => handleAction('kill')}
            disabled={!isRunning || loading !== null}
          >
            {loading === 'kill' ? (
              <span className="spinner" />
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            )}{' '}
            KILL
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'dashboard' && <DashboardTab config={config} status={status} logs={logs} />}
        {activeTab === 'terminal' && (
          <TerminalTab config={config} logs={logs} isRunning={isRunning} />
        )}
        {activeTab === 'configuration' && (
          <ConfigurationTab
            instanceId={instanceId}
            config={config}
            isRunning={isRunning}
            loading={loading}
            onSave={handleSaveSettings}
          />
        )}
        {activeTab === 'schedules' && <ScheduleManagerTab instanceId={instanceId} />}
        {activeTab === 'players' && (
          <PlayerManagementTab instanceId={instanceId} isRunning={isRunning} />
        )}
        {activeTab === 'files' && <FileManagerTab instanceId={instanceId} />}
        {activeTab === 'logs' && <LogViewerTab instanceId={instanceId} />}
      </div>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={
          confirmState.action
            ? `Confirm ${confirmState.action.charAt(0).toUpperCase() + confirmState.action.slice(1)}`
            : 'Confirm'
        }
        confirmStyle={confirmState.confirmStyle}
        onConfirm={onConfirmAction}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}
