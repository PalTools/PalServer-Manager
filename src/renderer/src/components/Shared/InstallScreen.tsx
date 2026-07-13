import { InstallProgress } from '../../api/instancesApi'

interface Props {
  progress?: InstallProgress
}

export default function InstallScreen({ progress }: Props): React.JSX.Element {
  const percentage = progress?.percentage || 0
  const stage = progress?.stage || 'preparing'

  // Format stage to be more human readable
  const formatStage = (s: string): string => {
    const lower = s.toLowerCase()
    if (lower === 'downloading') return 'Downloading Dedicated Server Files...'
    if (lower === 'verifying') return 'Verifying Installation...'
    if (lower === 'preallocating') return 'Preallocating Space...'

    // SteamCMD custom stages
    if (lower.startsWith('steamcmd downloading')) return 'Downloading SteamCMD Engine...'
    if (lower.startsWith('steamcmd extracting')) return 'Extracting SteamCMD...'
    if (lower.includes('steamcmd') && lower.includes('update')) return 'Updating SteamCMD Engine...'

    return `Installing (${s})...`
  }

  return (
    <div className="install-screen">
      <div className="install-screen-content">
        <div className="install-spinner"></div>
        <h2 className="install-title">Installing Palworld Server</h2>
        <p className="install-subtitle">
          Please wait while SteamCMD downloads the server files. This may take several minutes
          depending on your connection.
        </p>

        <div className="install-progress-container">
          <div className="install-progress-header">
            <span className="install-stage">{formatStage(stage)}</span>
            <span className="install-percentage">{percentage.toFixed(1)}%</span>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${percentage}%` }}>
              <div className="progress-bar-glow"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
