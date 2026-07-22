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
import {
  IconSliders,
  IconShield,
  IconBuilding,
  IconUsers,
  IconNetwork,
  IconSettings,
  IconServer,
  IconFile
} from '../Shared/Icons'

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

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

function ToggleSwitch({ checked, onChange, disabled }: ToggleSwitchProps): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: '44px',
        height: '24px',
        padding: '2px',
        borderRadius: '12px',
        backgroundColor: checked ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.2s ease',
        outline: 'none'
      }}
    >
      <span
        style={{
          display: 'block',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          transform: checked ? 'translateX(20px)' : 'translateX(0px)',
          transition: 'transform 0.2s ease'
        }}
      />
    </button>
  )
}

interface CrossplayPlatformsEditorProps {
  value: string
  onChange: (val: string) => void
  disabled?: boolean
}

const ALL_PLATFORMS = ['Steam', 'Xbox', 'PS5', 'Mac']

function CrossplayPlatformsEditor({
  value,
  onChange,
  disabled
}: CrossplayPlatformsEditorProps): React.JSX.Element {
  const selectedPlatforms = useMemo(() => {
    const clean = value.replace(/[()\s]/g, '')
    if (!clean) return new Set<string>()
    return new Set(clean.split(',').filter((p) => ALL_PLATFORMS.includes(p)))
  }, [value])

  const togglePlatform = (platform: string): void => {
    if (disabled) return
    const next = new Set(selectedPlatforms)
    if (next.has(platform)) {
      next.delete(platform)
    } else {
      next.add(platform)
    }
    const parts = ALL_PLATFORMS.filter((p) => next.has(p))
    onChange(parts.length > 0 ? `(${parts.join(',')})` : '')
  }

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
      {ALL_PLATFORMS.map((platform) => {
        const active = selectedPlatforms.has(platform)
        return (
          <button
            key={platform}
            type="button"
            disabled={disabled}
            onClick={() => togglePlatform(platform)}
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              border: active ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: active ? 'rgba(56, 189, 248, 0.15)' : 'rgba(0, 0, 0, 0.2)',
              color: active ? '#38bdf8' : 'var(--text-muted)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {platform}
          </button>
        )
      })}
    </div>
  )
}

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
    const cleanValue = value.replace(/[()\s]/g, '')
    return new Set(
      cleanValue
        .split(',')
        .map((s) => s.trim().replace(/"/g, ''))
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
      <div style={{ display: 'flex', gap: '16px', padding: '4px 0', alignItems: 'center' }}>
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
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {selectedIds.size} technologies denied
        </span>
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

const NETWORK_KEYS = new Set([
  'ServerName',
  'ServerDescription',
  'AdminPassword',
  'ServerPassword',
  'PublicPort',
  'PublicIP',
  'RCONEnabled',
  'RCONPort',
  'Region',
  'bUseAuth',
  'BanListURL',
  'RESTAPIEnabled',
  'RESTAPIPort',
  'ChatPostLimitPerMinute',
  'CrossplayPlatforms',
  'bAllowClientMod'
])

const GUILD_PVP_KEYS = new Set([
  'DeathPenalty',
  'bEnableFriendlyFire',
  'bEnableInvaderEnemy',
  'bIsPvP',
  'GuildPlayerMaxNum',
  'GuildRejoinCooldownMinutes',
  'MaxGuildsPerFrame',
  'bCanPickupOtherGuildDeathPenaltyDrop',
  'bEnableDefenseOtherGuildPlayer',
  'bDisplayPvPItemNumOnWorldMap_BaseCamp',
  'bDisplayPvPItemNumOnWorldMap_Player',
  'AdditionalDropItemWhenPlayerKillingInPvPMode',
  'AdditionalDropItemNumWhenPlayerKillingInPvPMode',
  'bAdditionalDropItemWhenPlayerKillingInPvPMode'
])

const BUILDING_WORLD_KEYS = new Set([
  'DropItemMaxNum',
  'PhysicsActiveDropItemMaxNum',
  'DropItemMaxNum_UNKO',
  'BaseCampMaxNum',
  'BaseCampWorkerMaxNum',
  'BaseCampMaxNumInGuild',
  'DropItemAliveMaxHours',
  'bEnableFastTravelOnlyBaseCamp',
  'bInvisibleOtherGuildBaseCampAreaFX',
  'bBuildAreaLimit',
  'SupplyDropSpan',
  'MaxBuildingLimitNum',
  'ItemContainerForceMarkDirtyInterval',
  'bEnableBuildingPlayerUIdDisplay',
  'BuildObjectHpRate',
  'BuildObjectDamageRate',
  'BuildObjectDeteriorationDamageRate'
])

const PLAYER_PAL_KEYS = new Set([
  'bIsRandomizerPalLevelRandom',
  'bEnablePlayerToPlayerDamage',
  'bAutoResetGuildNoOnlinePlayers',
  'AutoResetGuildTimeNoOnlinePlayers',
  'bPalLost',
  'bExistPlayerAfterLogout',
  'CoopPlayerMaxNum',
  'ServerPlayerMaxNum',
  'bShowPlayerList',
  'EnablePredatorBossPal',
  'bAllowGlobalPalboxExport',
  'bAllowGlobalPalboxImport',
  'PlayerDataPalStorageUpdateCheckTickInterval',
  'bAllowEnhanceStat_Health',
  'bAllowEnhanceStat_Attack',
  'bAllowEnhanceStat_Stamina',
  'bAllowEnhanceStat_Weight',
  'bAllowEnhanceStat_WorkSpeed'
])

const RATES_KEYS = new Set([
  'DayTimeSpeedRate',
  'NightTimeSpeedRate',
  'ExpRate',
  'PalCaptureRate',
  'PalSpawnNumRate',
  'PalDamageRateAttack',
  'PalDamageRateDefense',
  'PlayerDamageRateAttack',
  'PlayerDamageRateDefense',
  'PlayerStomachDecreaceRate',
  'PlayerStaminaDecreaceRate',
  'PlayerAutoHPRegeneRate',
  'PlayerAutoHpRegeneRateInSleep',
  'PalStomachDecreaceRate',
  'PalStaminaDecreaceRate',
  'PalAutoHPRegeneRate',
  'PalAutoHpRegeneRateInSleep',
  'CollectionDropRate',
  'CollectionObjectHpRate',
  'CollectionObjectRespawnSpeedRate',
  'EnemyDropItemRate',
  'PalEggDefaultHatchingTime',
  'WorkSpeedRate',
  'ItemWeightRate',
  'EquipmentDurabilityDamageRate',
  'ItemCorruptionMultiplier',
  'MonsterFarmActionSpeedRate',
  'RespawnPenaltyTimeScale'
])

function normalizeCategory(cat: string): string {
  if (cat === 'World & Building' || cat === 'Building & World') return 'Building & World'
  if (cat === 'PvP & Guild' || cat === 'Guilds & PvP') return 'Guilds & PvP'
  if (cat === 'Player & Pals' || cat === 'Player & Pal Stats') return 'Player & Pal Stats'
  return cat
}

function getSettingCategory(s: PalworldSettingSchema): string {
  if (NETWORK_KEYS.has(s.key)) return 'Network & Security'
  if (GUILD_PVP_KEYS.has(s.key)) return 'Guilds & PvP'
  if (BUILDING_WORLD_KEYS.has(s.key)) return 'Building & World'
  if (PLAYER_PAL_KEYS.has(s.key)) return 'Player & Pal Stats'
  if (RATES_KEYS.has(s.key)) return 'Rates & Multipliers'

  const norm = normalizeCategory(s.category)
  if (
    norm === 'Network & Security' ||
    norm === 'Guilds & PvP' ||
    norm === 'Building & World' ||
    norm === 'Player & Pal Stats' ||
    norm === 'Rates & Multipliers'
  ) {
    return norm
  }

  return 'General'
}

export default function ConfigurationTab({
  instanceId,
  config,
  isRunning,
  loading,
  onSave
}: Props): React.JSX.Element {
  const [schema, setSchema] = useState<PalworldSettingSchema[]>([])

  const [formName, setFormName] = useState(config.name)
  const [formQueryPort, setFormQueryPort] = useState(String(config.settings.queryPort))
  const [formPublicLobby, setFormPublicLobby] = useState(config.settings.publicLobby)
  const [formAutoUpdate, setFormAutoUpdate] = useState(config.settings.autoUpdate ?? true)

  const [PalworldSettings, setPalworldSettings] = useState<
    Record<string, string | number | boolean>
  >(config.PalworldSettings || {})

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('All')

  const [editorMode, setEditorMode] = useState<'list' | 'instance' | 'form' | 'file'>('list')
  const [selectedFile, setSelectedFile] = useState<string>(
    'Pal/Saved/Config/WindowsServer/PalWorldSettings.ini'
  )
  const [fileContent, setFileContent] = useState<string>('')
  const [fileDirty, setFileDirty] = useState<boolean>(false)
  const [fileLoading, setFileLoading] = useState<boolean>(false)

  const CONFIG_ITEMS = [
    {
      id: 'instance',
      label: 'Instance Settings',
      path: 'Launcher & Server Instance Configuration',
      type: 'instance',
      description:
        'Instance launcher parameters including Name, Query Port, Public Lobby, and Auto-Update on Boot.'
    },
    {
      id: 'palworld',
      label: 'PalWorldSettings.ini',
      path: 'Pal/Saved/Config/WindowsServer/PalWorldSettings.ini',
      type: 'palworld',
      description: 'Palworld server rules, rates, player/Pal stats, building limits, and security.'
    },
    {
      id: 'engine',
      label: 'Engine.ini',
      path: 'Pal/Saved/Config/WindowsServer/Engine.ini',
      type: 'file',
      description: 'Unreal Engine environment settings and networking buffers.'
    },
    {
      id: 'gameuser',
      label: 'GameUserSettings.ini',
      path: 'Pal/Saved/Config/WindowsServer/GameUserSettings.ini',
      type: 'file',
      description: 'Game engine user settings and session parameters.'
    }
  ]

  const CATEGORY_TABS = [
    { id: 'All', label: 'All Settings', Icon: IconSliders },
    { id: 'General', label: 'General', Icon: IconSettings },
    { id: 'Rates & Multipliers', label: 'Rates & Multipliers', Icon: IconSliders },
    { id: 'Player & Pal Stats', label: 'Player & Pals', Icon: IconUsers },
    { id: 'Building & World', label: 'Building & World', Icon: IconBuilding },
    { id: 'Guilds & PvP', label: 'Guilds & PvP', Icon: IconShield },
    { id: 'Network & Security', label: 'Network & Security', Icon: IconNetwork }
  ]

  useEffect(() => {
    let cancel = false
    if (editorMode === 'file') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFileLoading(true)
      readFile(instanceId, selectedFile)
        .then((content) => {
          if (!cancel) {
            setFileContent(content)
            setFileDirty(false)
          }
        })
        .catch((err) => {
          if (!cancel) {
            console.error(err)
            setFileContent('')
            setFileDirty(false)
          }
        })
        .finally(() => {
          if (!cancel) setFileLoading(false)
        })
    }
    return () => {
      cancel = true
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

  const instanceDirty = useMemo(() => {
    if (formName !== config.name) return true
    if (formQueryPort !== String(config.settings.queryPort)) return true
    if (formPublicLobby !== config.settings.publicLobby) return true
    if (formAutoUpdate !== (config.settings.autoUpdate ?? true)) return true
    return false
  }, [formName, formQueryPort, formPublicLobby, formAutoUpdate, config])

  const palworldDirty = useMemo(() => {
    const initialPalworldSettings = config.PalworldSettings || {}
    const currentKeys = Object.keys(PalworldSettings)
    const initialKeys = Object.keys(initialPalworldSettings)

    for (const key of new Set([...currentKeys, ...initialKeys])) {
      if (String(PalworldSettings[key] ?? '') !== String(initialPalworldSettings[key] ?? '')) {
        return true
      }
    }
    return false
  }, [PalworldSettings, config])

  const dirty = useMemo(() => {
    if (editorMode === 'instance') return instanceDirty
    if (editorMode === 'form') return palworldDirty
    return false
  }, [editorMode, instanceDirty, palworldDirty])

  const handleCancelInstance = (): void => {
    setFormName(config.name)
    setFormQueryPort(String(config.settings.queryPort))
    setFormPublicLobby(config.settings.publicLobby)
    setFormAutoUpdate(config.settings.autoUpdate ?? true)
  }

  const handleCancelPalworld = (): void => {
    setPalworldSettings(config.PalworldSettings || {})
  }

  useEffect(() => {
    getSettingsSchema().then(setSchema).catch(console.error)
  }, [])

  const handleSaveInstance = async (): Promise<void> => {
    await onSave({
      name: formName,
      settings: {
        publicLobby: formPublicLobby,
        queryPort: parseInt(formQueryPort) || 27015,
        restApiUsername: 'admin',
        autoUpdate: formAutoUpdate
      }
    })
  }

  const handleSavePalworld = async (): Promise<void> => {
    await onSave({
      PalworldSettings: PalworldSettings
    })
  }

  const handleGameSettingChange = (key: string, value: string | number | boolean): void => {
    setPalworldSettings((prev) => ({ ...prev, [key]: value }))
  }

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: 0 }
    const vis = schema.filter((s) => !s.hideInUI)
    counts.All = vis.length
    vis.forEach((s) => {
      const cat = getSettingCategory(s)
      counts[cat] = (counts[cat] || 0) + 1
    })
    return counts
  }, [schema])

  const filteredSchema = useMemo(() => {
    let result = schema.filter((s) => !s.hideInUI)
    if (activeTab !== 'All') {
      result = result.filter((s) => getSettingCategory(s) === activeTab)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (s) =>
          s.key.toLowerCase().includes(q) ||
          (s.displayName && s.displayName.toLowerCase().includes(q))
      )
    }
    return result
  }, [schema, searchQuery, activeTab])

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
              Configuration Files & Instance Settings
            </h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
              Select a configuration category below to view and edit its settings.
            </p>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}
            >
              {CONFIG_ITEMS.map((item) => (
                <div
                  key={item.id}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {item.type === 'instance' ? (
                      <IconServer style={{ width: '24px', height: '24px', color: '#38bdf8' }} />
                    ) : (
                      <IconFile
                        style={{ width: '24px', height: '24px', color: 'var(--text-muted)' }}
                      />
                    )}
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{item.label}</div>
                      <div
                        style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}
                      >
                        {item.description}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {item.type === 'instance' && (
                      <button className="btn btn-primary" onClick={() => setEditorMode('instance')}>
                        GUI Editor
                      </button>
                    )}
                    {item.type === 'palworld' && (
                      <>
                        <button className="btn btn-primary" onClick={() => setEditorMode('form')}>
                          GUI Editor
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ border: '1px solid rgba(255,255,255,0.2)' }}
                          onClick={() => {
                            setFileLoading(true)
                            setFileContent('')
                            setSelectedFile(item.path)
                            setEditorMode('file')
                          }}
                        >
                          File Editor
                        </button>
                      </>
                    )}
                    {item.type === 'file' && (
                      <button
                        className="btn btn-ghost"
                        style={{ border: '1px solid rgba(255,255,255,0.2)' }}
                        onClick={() => {
                          setFileLoading(true)
                          setFileContent('')
                          setSelectedFile(item.path)
                          setEditorMode('file')
                        }}
                      >
                        File Editor
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {editorMode !== 'list' && (
          <div style={{ marginBottom: '20px' }}>
            <button
              className="btn btn-link"
              style={{ color: '#38bdf8', padding: 0 }}
              onClick={() => {
                if (
                  (editorMode === 'instance' && instanceDirty) ||
                  (editorMode === 'form' && palworldDirty) ||
                  (editorMode === 'file' && fileDirty)
                ) {
                  if (!confirm('You have unsaved changes. Are you sure you want to go back?'))
                    return
                }
                setEditorMode('list')
                setFileContent('')
                if (editorMode === 'instance') handleCancelInstance()
                if (editorMode === 'form') handleCancelPalworld()
              }}
            >
              ← Back to Configuration List
            </button>
          </div>
        )}

        {editorMode === 'instance' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div
              className="panel"
              style={{
                padding: '24px',
                backgroundColor: 'rgba(56, 189, 248, 0.03)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '12px',
                marginBottom: '20px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '20px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingBottom: '12px'
                }}
              >
                <IconServer style={{ color: '#38bdf8' }} />
                <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text)' }}>
                  Instance Launcher Settings
                </h3>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '24px'
                }}
              >
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    Instance Name <InfoIcon />
                  </label>
                  <input
                    className="form-input"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    disabled={isRunning}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    Query Port <InfoIcon />
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    value={formQueryPort}
                    onChange={(e) => setFormQueryPort(e.target.value)}
                    disabled={isRunning}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ marginBottom: '8px' }}>
                    Public Lobby Registration <InfoIcon />
                  </label>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '38px' }}
                  >
                    <ToggleSwitch
                      checked={formPublicLobby}
                      onChange={(val) => setFormPublicLobby(val)}
                      disabled={isRunning}
                    />
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                      {formPublicLobby ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ marginBottom: '8px' }}>
                    Auto-Update on Boot <InfoIcon />
                  </label>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '38px' }}
                  >
                    <ToggleSwitch
                      checked={formAutoUpdate}
                      onChange={(val) => setFormAutoUpdate(val)}
                      disabled={isRunning}
                    />
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                      {formAutoUpdate ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {editorMode === 'form' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <input
                className="form-input"
                style={{ width: '100%' }}
                placeholder="Search settings by key or display name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

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
              {CATEGORY_TABS.map(({ id, label, Icon }) => {
                const active = activeTab === id
                const count = categoryCounts[id] ?? 0
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      backgroundColor: active ? '#38bdf8' : 'transparent',
                      color: active ? '#000' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      transition: 'background-color 0.2s, color 0.2s'
                    }}
                  >
                    <Icon style={{ width: '16px', height: '16px' }} />
                    {label} ({count})
                  </button>
                )
              })}
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
                {filteredSchema.map((s) => {
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

                  if (s.type === 'CrossplayPlatforms') {
                    return (
                      <div
                        key={s.key}
                        className="form-group"
                        style={{ margin: 0, gridColumn: '1 / -1' }}
                      >
                        <label className="form-label" title={s.description || s.key}>
                          {s.displayName || s.key} <InfoIcon />
                        </label>
                        <CrossplayPlatformsEditor
                          value={String(val)}
                          onChange={(newVal) => handleGameSettingChange(s.key, newVal)}
                          disabled={isRunning}
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
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            height: '38px'
                          }}
                        >
                          <ToggleSwitch
                            checked={isTrue}
                            onChange={(checked) =>
                              handleGameSettingChange(s.key, checked ? 'True' : 'False')
                            }
                            disabled={isRunning}
                          />
                          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                            {isTrue ? 'True' : 'False'}
                          </span>
                        </div>
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

              {filteredSchema.length === 0 && (
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
          key={`${instanceId}:${selectedFile}`}
          filename={selectedFile.split('/').pop() || ''}
          initialContent={fileContent}
          onSave={handleSaveFile}
          onClose={() => {
            setEditorMode('list')
            setFileContent('')
          }}
          saving={fileLoading}
          readOnly={isRunning}
          warning={
            isRunning
              ? 'Server is running. Files should not be edited while the server is active.'
              : undefined
          }
        />
      )}

      {dirty && (editorMode === 'instance' || editorMode === 'form') && (
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
              onClick={editorMode === 'instance' ? handleCancelInstance : handleCancelPalworld}
              disabled={loading === 'save' || isRunning}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              style={{ width: '200px' }}
              onClick={editorMode === 'instance' ? handleSaveInstance : handleSavePalworld}
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
