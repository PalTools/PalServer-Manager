import { useState, useEffect, useMemo } from 'react'
import {
  InstanceConfig,
  InstancePatch,
  PalworldSettingSchema,
  getSettingsSchema,
  readFile,
  writeFile
} from '../../api/instancesApi'
import FileEditorModal from '../Shared/FileEditorModal'
import { PALWORLD_TECHNOLOGIES } from '../../api/technologies'

interface Props {
  instanceId: string
  config: InstanceConfig
  isRunning: boolean
  loading: string | null
  onSave: (patch: InstancePatch) => Promise<void>
}

const InfoIcon = (): React.JSX.Element => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '16px',
      height: '16px',
      backgroundColor: '#38bdf8',
      color: '#fff',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 'bold',
      marginLeft: '8px',
      cursor: 'help',
      verticalAlign: 'text-bottom'
    }}
  >
    i
  </span>
)

const DenyTechnologyEditor = ({
  value,
  onChange,
  isRunning
}: {
  value: string
  onChange: (val: string) => void
  isRunning: boolean
}): React.JSX.Element => {
  const [search, setSearch] = useState('')

  const selectedIds = useMemo(() => {
    if (!value) return new Set<string>()
    return new Set(
      value
        .split(',')
        .map((s) => s.trim().replace(/^"|"$/g, ''))
        .filter(Boolean)
    )
  }, [value])

  const filteredTechs = useMemo(() => {
    if (!search) return PALWORLD_TECHNOLOGIES
    const lower = search.toLowerCase()
    return PALWORLD_TECHNOLOGIES.filter(
      (t) => t.name.toLowerCase().includes(lower) || t.id.toLowerCase().includes(lower)
    )
  }, [search])

  const toggleTech = (id: string, isChecked: boolean): void => {
    const newSet = new Set(selectedIds)
    if (isChecked) newSet.add(id)
    else newSet.delete(id)
    onChange(Array.from(newSet).join(','))
  }

  const selectAll = (): void => {
    const newSet = new Set(selectedIds)
    filteredTechs.forEach((t) => newSet.add(t.id))
    onChange(Array.from(newSet).join(','))
  }

  const clearAll = (): void => {
    const newSet = new Set(selectedIds)
    filteredTechs.forEach((t) => newSet.delete(t.id))
    onChange(Array.from(newSet).join(','))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
      <input
        className="form-input"
        placeholder="Search technologies..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div style={{ display: 'flex', gap: '16px', padding: '4px 0' }}>
        <button
          className="btn-link"
          onClick={selectAll}
          disabled={isRunning}
          style={{
            color: '#38bdf8',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: 0
          }}
        >
          Select All
        </button>
        <button
          className="btn-link"
          onClick={clearAll}
          disabled={isRunning}
          style={{
            color: '#38bdf8',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: 0
          }}
        >
          Clear All
        </button>
      </div>
      <div
        className="form-input"
        style={{
          height: '220px',
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '6px'
        }}
      >
        {filteredTechs.map((t) => (
          <label
            key={t.id}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              checked={selectedIds.has(t.id)}
              onChange={(e) => {
                if (!isRunning) toggleTech(t.id, e.target.checked)
              }}
              disabled={isRunning}
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#38bdf8' }}
            />
            <span style={{ fontSize: '14px', color: 'var(--text)' }}>{t.name}</span>
          </label>
        ))}
        {filteredTechs.length === 0 && (
          <span style={{ color: 'var(--text-muted)' }}>No technologies found.</span>
        )}
      </div>
    </div>
  )
}

export default function ConfigurationTab({
  instanceId,
  config,
  isRunning,
  loading,
  onSave
}: Props): React.JSX.Element {
  const [schema, setSchema] = useState<PalworldSettingSchema[]>([])

  // Manager specific states
  const [formName, setFormName] = useState(config.name)
  const [formQueryPort, setFormQueryPort] = useState(String(config.settings.queryPort))
  const [formPublicLobby, setFormPublicLobby] = useState(config.settings.publicLobby)

  // Dynamic game settings state
  const [PalworldSettings, setPalworldSettings] = useState<
    Record<string, string | number | boolean>
  >(config.PalworldSettings || {})

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('All')

  // File Editor state
  const [editorMode, setEditorMode] = useState<'list' | 'form' | 'file'>('list')
  const [selectedFile, setSelectedFile] = useState<string>(
    'Pal/Saved/Config/WindowsServer/PalWorldSettings.ini'
  )
  const [fileContent, setFileContent] = useState<string>('')
  const [fileDirty, setFileDirty] = useState<boolean>(false)
  const [fileLoading, setFileLoading] = useState<boolean>(false)

  const INI_FILES = [
    { label: 'PalWorldSettings.ini', path: 'Pal/Saved/Config/WindowsServer/PalWorldSettings.ini' },
    { label: 'Engine.ini', path: 'Pal/Saved/Config/WindowsServer/Engine.ini' },
    { label: 'GameUserSettings.ini', path: 'Pal/Saved/Config/WindowsServer/GameUserSettings.ini' }
  ]

  useEffect(() => {
    if (editorMode === 'file') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFileLoading(true)
      readFile(instanceId, selectedFile)
        .then((content) => {
          setFileContent(content)
          setFileDirty(false)
        })
        .catch((err) => {
          console.error(err)
          setFileContent('')
          setFileDirty(false)
        })
        .finally(() => setFileLoading(false))
    }
  }, [editorMode, selectedFile, instanceId])

  const handleSaveFile = async (content: string): Promise<void> => {
    setFileLoading(true)
    try {
      await writeFile(instanceId, selectedFile, content)
      setFileDirty(false)
      setEditorMode('list')
    } catch (err) {
      alert(`Failed to save file: ${err}`)
    } finally {
      setFileLoading(false)
    }
  }

  const dirty = useMemo(() => {
    if (formName !== config.name) return true
    if (formQueryPort !== String(config.settings.queryPort)) return true
    if (formPublicLobby !== config.settings.publicLobby) return true

    const initialPalworldSettings = config.PalworldSettings || {}
    const currentKeys = Object.keys(PalworldSettings)
    const initialKeys = Object.keys(initialPalworldSettings)

    for (const key of new Set([...currentKeys, ...initialKeys])) {
      if (String(PalworldSettings[key] ?? '') !== String(initialPalworldSettings[key] ?? '')) {
        return true
      }
    }
    return false
  }, [formName, formQueryPort, formPublicLobby, PalworldSettings, config])

  const handleCancel = (): void => {
    setFormName(config.name)
    setFormQueryPort(String(config.settings.queryPort))
    setFormPublicLobby(config.settings.publicLobby)
    setPalworldSettings(config.PalworldSettings || {})
  }

  useEffect(() => {
    getSettingsSchema().then(setSchema).catch(console.error)
  }, [])

  const handleSave = async (): Promise<void> => {
    await onSave({
      name: formName,
      settings: {
        publicLobby: formPublicLobby,
        queryPort: parseInt(formQueryPort) || 27015,
        restApiUsername: 'admin'
      },
      PalworldSettings: PalworldSettings
    })
  }

  const handleGameSettingChange = (key: string, value: string | number | boolean): void => {
    setPalworldSettings((prev) => ({ ...prev, [key]: value }))
  }

  const categories = useMemo(() => {
    const cats = new Set(schema.filter((s) => !s.hideInUI).map((s) => s.category))
    return ['All', 'Manager', ...Array.from(cats)]
  }, [schema])

  const filteredSchema = useMemo(() => {
    let result = schema.filter((s) => !s.hideInUI)
    if (activeTab !== 'All' && activeTab !== 'Manager') {
      result = result.filter((s) => s.category === activeTab)
    }
    if (searchQuery) {
      result = result.filter((s) => s.key.toLowerCase().includes(searchQuery.toLowerCase()))
    }
    return result
  }, [schema, searchQuery, activeTab])

  const matchSearch = (text: string): boolean =>
    text.toLowerCase().includes(searchQuery.toLowerCase())

  const showManagerSettings = activeTab === 'All' || activeTab === 'Manager' || searchQuery !== ''

  const renderManagerFields = (): React.JSX.Element[] => {
    const fields: React.JSX.Element[] = []

    if (!searchQuery || matchSearch('Instance Name')) {
      fields.push(
        <div key="formName" className="form-group" style={{ margin: 0 }}>
          <label className="form-label">
            Instance Name <InfoIcon />
          </label>
          <input
            className="form-input"
            value={formName}
            onChange={(e) => {
              setFormName(e.target.value)
            }}
            disabled={isRunning}
          />
        </div>
      )
    }

    if (!searchQuery || matchSearch('Query Port')) {
      fields.push(
        <div key="formQueryPort" className="form-group" style={{ margin: 0 }}>
          <label className="form-label">
            Query Port <InfoIcon />
          </label>
          <input
            className="form-input"
            type="number"
            value={formQueryPort}
            onChange={(e) => {
              setFormQueryPort(e.target.value)
            }}
            disabled={isRunning}
          />
        </div>
      )
    }

    if (!searchQuery || matchSearch('Public Lobby')) {
      fields.push(
        <div key="formPublicLobby" className="form-group" style={{ margin: 0 }}>
          <label className="form-label">
            Public Lobby <InfoIcon />
          </label>
          <select
            className="form-input"
            value={formPublicLobby ? 'True' : 'False'}
            onChange={(e) => {
              if (!isRunning) {
                setFormPublicLobby(e.target.value === 'True')
              }
            }}
            disabled={isRunning}
          >
            <option value="True">True</option>
            <option value="False">False</option>
          </select>
        </div>
      )
    }

    return fields
  }

  return (
    <div
      data-testid="ConfigurationTab"
      className="tab-pane"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <div
        className="panel"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          overflow: 'hidden'
        }}
      >
        {editorMode === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text)' }}>
              Configuration Files
            </h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
              Select a configuration file below to edit its contents.
            </p>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}
            >
              {INI_FILES.map((f) => (
                <div
                  key={f.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{f.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {f.path}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {f.label === 'PalWorldSettings.ini' && (
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setSelectedFile(f.path)
                          setEditorMode('form')
                        }}
                      >
                        GUI Editor
                      </button>
                    )}
                    <button
                      className="btn btn-ghost"
                      style={{ border: '1px solid rgba(255,255,255,0.2)' }}
                      onClick={() => {
                        setSelectedFile(f.path)
                        setEditorMode('file')
                      }}
                    >
                      File Editor
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {editorMode !== 'list' && (
          <div style={{ marginBottom: '24px' }}>
            <button
              className="btn btn-link"
              style={{ color: '#38bdf8', padding: 0 }}
              onClick={() => {
                if ((editorMode === 'form' && dirty) || (editorMode === 'file' && fileDirty)) {
                  if (!confirm('You have unsaved changes. Are you sure you want to go back?'))
                    return
                }
                setEditorMode('list')
                if (editorMode === 'form') handleCancel()
              }}
            >
              ← Back to File List
            </button>
          </div>
        )}

        {editorMode === 'form' && (
          <>
            {/* Top Search Bar */}
            <div style={{ marginBottom: '24px' }}>
              <input
                className="form-input"
                style={{ width: '100%' }}
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Categories Navigation Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '24px',
                overflowX: 'auto',
                paddingBottom: '12px',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: activeTab === cat ? '#38bdf8' : 'transparent',
                    color: activeTab === cat ? '#000' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    transition: 'background-color 0.2s, color 0.2s'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {isRunning && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '8px',
                  color: '#ef4444',
                  marginBottom: '20px',
                  fontSize: '14px'
                }}
              >
                <strong>Server is running.</strong> Settings cannot be edited until the server is
                stopped.
              </div>
            )}

            {/* Main Settings Grid */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                opacity: isRunning ? 0.6 : 1,
                pointerEvents: isRunning ? 'none' : 'auto',
                paddingRight: '12px',
                paddingBottom: '24px'
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                  columnGap: '48px',
                  rowGap: '24px',
                  alignItems: 'start'
                }}
              >
                {showManagerSettings && renderManagerFields()}

                {(activeTab === 'All' || activeTab !== 'Manager') &&
                  filteredSchema.map((s) => {
                    const val = PalworldSettings[s.key] ?? s.defaultValue

                    if (s.key === 'DenyTechnologyList') {
                      return (
                        <div
                          key={s.key}
                          className="form-group"
                          style={{ margin: 0, gridColumn: '1 / -1' }}
                        >
                          <label className="form-label" title={s.description || s.key}>
                            {s.displayName || s.key} <InfoIcon />
                          </label>
                          <DenyTechnologyEditor
                            value={String(val)}
                            onChange={(newVal) => handleGameSettingChange(s.key, newVal)}
                            isRunning={isRunning}
                          />
                        </div>
                      )
                    }

                    if (s.type === 'TrueFalse') {
                      const isTrue = String(val).toLowerCase() === 'true'
                      return (
                        <div key={s.key} className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" title={s.description || s.key}>
                            {s.displayName || s.key} <InfoIcon />
                          </label>
                          <select
                            className="form-input"
                            value={isTrue ? 'True' : 'False'}
                            onChange={(e) => {
                              if (!isRunning) {
                                handleGameSettingChange(s.key, e.target.value)
                              }
                            }}
                            disabled={isRunning}
                          >
                            <option value="True">True</option>
                            <option value="False">False</option>
                          </select>
                        </div>
                      )
                    }

                    return (
                      <div key={s.key} className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" title={s.description || s.key}>
                          {s.displayName || s.key} <InfoIcon />
                        </label>
                        <input
                          className="form-input"
                          type={
                            s.type === 'Numeric' ||
                            s.type === 'Floating' ||
                            s.type === 'NumericSigned'
                              ? 'number'
                              : 'text'
                          }
                          step={s.type === 'Floating' ? '0.000001' : '1'}
                          value={String(val)}
                          onChange={(e) => handleGameSettingChange(s.key, e.target.value)}
                          disabled={isRunning}
                        />
                      </div>
                    )
                  })}
              </div>

              {filteredSchema.length === 0 && renderManagerFields().length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '64px 0' }}>
                  No settings match your search.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {editorMode === 'file' && !fileLoading && (
        <FileEditorModal
          filename={selectedFile.split('/').pop() || ''}
          initialContent={fileContent}
          onSave={handleSaveFile}
          onClose={() => setEditorMode('list')}
          saving={fileLoading}
          readOnly={isRunning}
          warning={
            isRunning
              ? 'Server is running. Files should not be edited while the server is active.'
              : undefined
          }
        />
      )}

      {dirty && editorMode === 'form' && (
        <div
          className="panel"
          style={{
            marginTop: '20px',
            position: 'sticky',
            bottom: '24px',
            zIndex: 10,
            boxShadow: '0 -10px 25px rgba(0,0,0,0.3)',
            border: '1px solid var(--accent)',
            padding: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
            You have unsaved changes.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn btn-ghost"
              onClick={handleCancel}
              disabled={loading === 'save' || isRunning}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              style={{ width: '200px' }}
              onClick={handleSave}
              disabled={loading === 'save' || isRunning}
            >
              {loading === 'save' ? <span className="spinner" /> : null}
              Save Configuration
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
