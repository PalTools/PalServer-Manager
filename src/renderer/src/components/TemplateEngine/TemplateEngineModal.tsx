import { useState, useEffect } from 'react'
import {
  getTemplateStatus,
  installTemplate,
  onTemplateProgress,
  TemplateStatus
} from '../../api/templateApi'
import InstallScreen from '../Shared/InstallScreen'

export function TemplateEngineModal(): React.JSX.Element | null {
  const [status, setStatus] = useState<TemplateStatus | 'checking'>('checking')
  const [isInstalling, setIsInstalling] = useState(false)
  const [progress, setProgress] = useState<{ stage: string; percentage: number } | undefined>()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkStatus = async (): Promise<void> => {
      try {
        const s = await getTemplateStatus()
        setStatus(s)
      } catch (err) {
        console.error('Failed to get template status:', err)
        setError('Failed to check engine status.')
      }
    }
    checkStatus()
  }, [])

  useEffect(() => {
    if (isInstalling) {
      const unsubscribe = onTemplateProgress((data) => {
        setProgress(data)
      })
      return () => unsubscribe()
    }
    return undefined
  }, [isInstalling])

  const handleInstall = async (): Promise<void> => {
    setIsInstalling(true)
    setError(null)
    const result = await installTemplate()
    if (!result.success) {
      setError(result.error || 'Installation failed.')
      setIsInstalling(false)
    } else {
      setStatus('ok')
      setIsInstalling(false)
    }
  }

  if (status === 'ok' || status === 'checking') {
    return null // Do not show anything if it's fine
  }

  return (
    <div className="template-engine-overlay">
      <div className="template-engine-modal">
        {isInstalling ? (
          <div style={{ position: 'relative', width: '100%', minHeight: '300px' }}>
            <InstallScreen progress={progress} />
          </div>
        ) : (
          <div className="template-engine-prompt">
            <div className="icon-wrapper">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>

            <h2>
              {status === 'not_installed'
                ? 'Welcome to PalServer Manager!'
                : 'Engine Missing or Corrupted'}
            </h2>

            <p>
              {status === 'not_installed'
                ? 'To get started, we need to download the core Dedicated Server files via SteamCMD. This will act as a lightning-fast template for all your future servers.'
                : 'The core Dedicated Server files are missing or corrupted. We need to run a quick integrity check and redownload any missing files.'}
            </p>

            {error && <div className="error-box">{error}</div>}

            <button className="primary-button large-button" onClick={handleInstall}>
              {status === 'not_installed' ? 'Install Server Engine' : 'Fix Engine Files'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
