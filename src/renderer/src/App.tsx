import { useState, useEffect } from 'react'
import InstanceList from './pages/InstanceList'
import InstanceDetail from './pages/InstanceDetail'
import {
  listInstances,
  InstanceConfig,
  updateInstanceFiles,
  onInstanceStatus
} from './api/instancesApi'
import {
  getTemplateStatus,
  checkTemplateUpdate,
  installTemplate,
  onTemplateProgress
} from './api/templateApi'
import bgImage from './assets/bg.png'
import iconImage from './assets/icon.png'
import {
  IconDashboard,
  IconTerminal,
  IconSettings,
  IconFolder,
  IconServer,
  IconArrowLeft,
  IconFile
} from './components/Shared/Icons'

import { TemplateEngineModal } from './components/TemplateEngine/TemplateEngineModal'
import StartupUpdateModal from './components/Shared/StartupUpdateModal'

type View = { type: 'list' } | { type: 'detail'; id: string; tab: string }

function App(): React.JSX.Element {
  const [view, setView] = useState<View>({ type: 'list' })
  const [instances, setInstances] = useState<InstanceConfig[]>([])
  const [globalAlert, setGlobalAlert] = useState<string | null>(null)

  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [remoteBuildId, setRemoteBuildId] = useState<string | null>(null)
  const [currentBuildId, setCurrentBuildId] = useState<string | null>(null)
  const [templateUpdating, setTemplateUpdating] = useState(false)
  const [templateProgress, setTemplateProgress] = useState<{
    stage: string
    percentage: number
  } | null>(null)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [updatingInstances, setUpdatingInstances] = useState<
    Record<string, { stage: string; percentage: number }>
  >({})
  const [isUpdatingBatch, setIsUpdatingBatch] = useState(false)

  useEffect(() => {
    window.alert = (msg: unknown) => {
      setGlobalAlert(String(msg))
    }
  }, [])

  const refresh = async (): Promise<void> => {
    const list = (await listInstances()) as InstanceConfig[]
    setInstances(list)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
    const interval = setInterval(refresh, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let unmount = false
    const checkUpdatesOnBoot = async (): Promise<void> => {
      try {
        const status = await getTemplateStatus()
        if (status !== 'ok') return

        const res = await checkTemplateUpdate()
        if (unmount || !res.needsUpdate) return

        setRemoteBuildId(res.remoteBuildId)
        setCurrentBuildId(res.currentBuildId)
        setUpdateModalOpen(true)

        setTemplateUpdating(true)
        setTemplateProgress({ stage: 'Starting update...', percentage: 0 })

        const removeListener = onTemplateProgress((data) => {
          setTemplateProgress(data)
        })

        const installRes = await installTemplate()
        removeListener()
        setTemplateUpdating(false)

        if (!installRes.success) {
          setTemplateError(installRes.error || 'Failed to update template')
        }
      } catch (err) {
        console.error('Boot update check error:', err)
        setTemplateUpdating(false)
      }
    }

    checkUpdatesOnBoot()
    return () => {
      unmount = true
    }
  }, [])

  const handleUpdateSelectedInstances = async (selectedIds: string[]): Promise<void> => {
    setIsUpdatingBatch(true)

    const removeStatusListener = onInstanceStatus((status) => {
      if (status.id && status.installProgress) {
        setUpdatingInstances((prev) => ({
          ...prev,
          [status.id]: status.installProgress!
        }))
      }
    })

    try {
      for (const id of selectedIds) {
        setUpdatingInstances((prev) => ({
          ...prev,
          [id]: { stage: 'Starting update...', percentage: 0 }
        }))
        try {
          await updateInstanceFiles(id)
          setUpdatingInstances((prev) => ({
            ...prev,
            [id]: { stage: 'Update Complete', percentage: 100 }
          }))
        } catch (e) {
          setUpdatingInstances((prev) => ({
            ...prev,
            [id]: { stage: `Failed: ${e instanceof Error ? e.message : String(e)}`, percentage: 0 }
          }))
        }
      }
    } finally {
      removeStatusListener()
      setIsUpdatingBatch(false)
      refresh()
    }
  }

  const activeInstanceName =
    view.type === 'detail' ? instances.find((i) => i.id === view.id)?.name || 'Loading...' : ''

  return (
    <>
      <TemplateEngineModal />
      <StartupUpdateModal
        isOpen={updateModalOpen}
        remoteBuildId={remoteBuildId}
        currentBuildId={currentBuildId}
        instances={instances}
        templateUpdating={templateUpdating}
        templateProgress={templateProgress}
        templateError={templateError}
        updatingInstances={updatingInstances}
        isUpdatingBatch={isUpdatingBatch}
        onUpdateSelected={handleUpdateSelectedInstances}
        onClose={() => setUpdateModalOpen(false)}
      />
      <div className="titlebar-drag" />
      <div className="app-bg" style={{ backgroundImage: `url(${bgImage})` }} />
      <div className="app-container">
        <nav className="sidebar">
          {view.type === 'list' ? (
            <>
              <div className="sidebar-header">
                <img src={iconImage} alt="PalServer Manager" className="sidebar-logo" />
                <div>
                  <div className="sidebar-title">PalServer Manager</div>
                  <div className="sidebar-subtitle">PalTools</div>
                </div>
              </div>

              <div className="sidebar-content">
                <div className="sidebar-section-title">Global Navigation</div>
                <div className="sidebar-item active">
                  <IconServer />
                  <span>All Instances</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="sidebar-header" style={{ paddingBottom: '16px', gap: '12px' }}>
                <button
                  className="btn btn-ghost"
                  style={{
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '40px',
                    minWidth: '40px',
                    width: '40px',
                    height: '40px',
                    flexShrink: 0
                  }}
                  onClick={() => {
                    setView({ type: 'list' })
                    refresh()
                  }}
                >
                  <IconArrowLeft />
                </button>
                <div style={{ overflow: 'hidden' }}>
                  <div className="sidebar-subtitle">SERVER ADMINISTRATION</div>
                  <div
                    className="sidebar-title"
                    style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}
                  >
                    {activeInstanceName}
                  </div>
                </div>
              </div>

              <div className="sidebar-content">
                <div className="sidebar-section-title">Server Controls</div>

                <div
                  className={`sidebar-item ${view.tab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setView({ ...view, tab: 'dashboard' })}
                >
                  <IconDashboard />
                  <span>Dashboard</span>
                </div>

                <div
                  className={`sidebar-item ${view.tab === 'terminal' ? 'active' : ''}`}
                  onClick={() => setView({ ...view, tab: 'terminal' })}
                >
                  <IconTerminal />
                  <span>Terminal</span>
                </div>

                <div
                  className={`sidebar-item ${view.tab === 'configuration' ? 'active' : ''}`}
                  onClick={() => setView({ ...view, tab: 'configuration' })}
                >
                  <IconSettings />
                  <span>Configuration</span>
                </div>

                <div
                  className={`sidebar-item ${view.tab === 'players' ? 'active' : ''}`}
                  onClick={() => setView({ ...view, tab: 'players' })}
                >
                  <IconServer />
                  <span>Players</span>
                </div>

                <div
                  className={`sidebar-item ${view.tab === 'files' ? 'active' : ''}`}
                  onClick={() => setView({ ...view, tab: 'files' })}
                >
                  <IconFolder />
                  <span>File Manager</span>
                </div>

                <div
                  className={`sidebar-item ${view.tab === 'logs' ? 'active' : ''}`}
                  onClick={() => setView({ ...view, tab: 'logs' })}
                >
                  <IconFile />
                  <span>Log Viewer</span>
                </div>
              </div>
            </>
          )}
        </nav>

        <main className="main-content">
          {view.type === 'list' ? (
            <InstanceList
              onSelectInstance={(id) => setView({ type: 'detail', id, tab: 'dashboard' })}
            />
          ) : (
            <InstanceDetail key={view.id} instanceId={view.id} activeTab={view.tab} />
          )}
        </main>
      </div>

      {globalAlert && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal">
            <h3 className="modal-title" style={{ color: 'var(--danger-color, #ff4d4f)' }}>
              Notice
            </h3>
            <p style={{ whiteSpace: 'pre-wrap', marginBottom: '24px' }}>{globalAlert}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setGlobalAlert(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App
