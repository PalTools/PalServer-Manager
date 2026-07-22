import { useState, useEffect } from 'react'
import InstanceList from './pages/InstanceList'
import InstanceDetail from './pages/InstanceDetail'
import { listInstances, InstanceConfig } from './api/instancesApi'
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

type View = { type: 'list' } | { type: 'detail'; id: string; tab: string }

function App(): React.JSX.Element {
  const [view, setView] = useState<View>({ type: 'list' })
  const [instances, setInstances] = useState<InstanceConfig[]>([])
  const [globalAlert, setGlobalAlert] = useState<string | null>(null)

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

  const activeInstanceName =
    view.type === 'detail' ? instances.find((i) => i.id === view.id)?.name || 'Loading...' : ''

  return (
    <>
      <TemplateEngineModal />
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
