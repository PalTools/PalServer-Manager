import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  useMap,
  useMapEvents
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import {
  PersistedPlayer,
  getPlayers,
  kickPlayer,
  banPlayer,
  unbanPlayer
} from '../../api/playersApi'
import { gameToLatLng, latLngToGame } from '../../utils/CoordinateMapper'
import playerMarkerImg from '../../assets/player-marker.webp'

import fastTravelPointsData from '../../assets/data/fast_travel_points.json'
import bossesData from '../../assets/data/bosses.json'

interface FastTravelPoint {
  id: string
  x: number
  y: number
  z: number
  class: string
  localized_name: string
}

interface BossData {
  spawner_id: string
  character_id: string
  level: number
  x: number
  y: number
  z: number
  localized_name: string
}

const fastTravelIcon = new L.Icon({
  iconUrl: new URL('../../assets/map-icons/fttower.webp', import.meta.url).href,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
  tooltipAnchor: [0, -16]
})

const watchTowerIcon = new L.Icon({
  iconUrl: new URL('../../assets/map-icons/ftunlockmap.webp', import.meta.url).href,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
  tooltipAnchor: [0, -16]
})

const getFastTravelIcon = (className: string): L.Icon => {
  return className === 'BP_LevelObject_UnlockMapPoint_C' ? watchTowerIcon : fastTravelIcon
}

const getBossIcon = (charId: string, zoom: number): L.DivIcon => {
  const name = charId.toLowerCase().replace('boss_', '')
  const url = new URL(`../../assets/map-icons/bosses/${name}.webp`, import.meta.url).href

  const size = Math.max(20, 12 + zoom * 6)
  const innerSize = size - 4

  return new L.DivIcon({
    html: `<div style="width: ${innerSize}px; height: ${innerSize}px; border: 2px solid #ff4757; border-radius: 50%; overflow: hidden; background: rgba(20, 26, 35, 0.9); box-shadow: 0 0 10px rgba(255, 71, 87, 0.6); display: flex; align-items: center; justify-content: center;"><img src="${url}" style="width: 100%; height: 100%; object-fit: cover;" /></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    tooltipAnchor: [0, -size / 2],
    className: ''
  })
}

function ZoomTracker({
  setMapZoom
}: {
  setMapZoom: (z: number) => void
}): React.JSX.Element | null {
  useMapEvents({
    zoomend: (e) => setMapZoom(e.target.getZoom())
  })
  return null
}

// Define the marker icons
const playerIcon = new L.Icon({
  iconUrl: playerMarkerImg,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
})

const offlinePlayerIcon = new L.Icon({
  iconUrl: playerMarkerImg,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
  className: 'offline-marker'
})

const bannedPlayerIcon = new L.Icon({
  iconUrl: playerMarkerImg,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
  className: 'banned-marker'
})

interface Props {
  instanceId: string
  isRunning: boolean
}

// A component to force map updates and bounds
const MapUpdater: React.FC<{ mapId: 'main' | 'tree' }> = ({ mapId }) => {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
    const bounds = L.latLngBounds([0, 0], [-256, 256])

    // Set a good default view that is zoomed in (level 3)
    map.setView([-128, 128], 3)

    // Lock the max zoom out to prevent seeing any black boxes at all
    map.setMinZoom(3)
    map.setMaxBounds(bounds)
  }, [mapId, map])
  return null
}

const CoordDisplay: React.FC<{ mapId: 'main' | 'tree' }> = ({ mapId }) => {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null)

  useMapEvents({
    mousemove(e) {
      setCoords(latLngToGame(e.latlng, mapId))
    },
    mouseout() {
      setCoords(null)
    }
  })

  if (!coords) return null

  const mapX = Math.round(coords.y / 1000)
  const mapY = Math.round(coords.x / 1000)

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '24px',
        zIndex: 1000,
        background: 'rgba(20, 26, 35, 0.85)',
        padding: '12px 20px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Map Coords */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              color: 'var(--accent)',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.05em'
            }}
          >
            MAP
          </span>
          <span
            style={{ color: '#fff', fontSize: '14px', fontWeight: 600, fontFamily: 'monospace' }}
          >
            {mapX}, {mapY}
          </span>
        </div>

        <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.15)' }} />

        {/* World (Unreal) Coords */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              color: 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.05em'
            }}
          >
            WORLD
          </span>
          <span
            style={{ color: '#fff', fontSize: '13px', fontWeight: 500, fontFamily: 'monospace' }}
          >
            {Math.round(coords.x)}, {Math.round(coords.y)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function LivemapTab({ instanceId, isRunning }: Props): React.JSX.Element {
  const [activeMap, setActiveMap] = useState<'main' | 'tree'>('main')
  const [players, setPlayers] = useState<PersistedPlayer[]>([])
  const [filterOnline, setFilterOnline] = useState(true)
  const [filterOffline, setFilterOffline] = useState(true)
  const [filterBanned, setFilterBanned] = useState(true)
  const [filterFastTravel, setFilterFastTravel] = useState(true)
  const [filterBosses, setFilterBosses] = useState(true)
  const [mapZoom, setMapZoom] = useState(3)

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    x: number
    y: number
    player: PersistedPlayer | null
  }>({
    visible: false,
    x: 0,
    y: 0,
    player: null
  })

  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = (text: string, id: string): void => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev))
    }, 1500)
  }

  const handleKick = async (): Promise<void> => {
    if (!contextMenu.player || !isRunning) return
    try {
      await kickPlayer(instanceId, contextMenu.player.userId, 'Kicked by Admin via Map')
    } catch (e: unknown) {
      alert(`Failed to kick: ${e instanceof Error ? e.message : String(e)}`)
    }
    setContextMenu({ visible: false, x: 0, y: 0, player: null })
  }

  const handleBan = async (): Promise<void> => {
    if (!contextMenu.player || !isRunning) return
    try {
      await banPlayer(instanceId, contextMenu.player.userId, 'Banned by Admin via Map')
    } catch (e: unknown) {
      alert(`Failed to ban: ${e instanceof Error ? e.message : String(e)}`)
    }
    setContextMenu({ visible: false, x: 0, y: 0, player: null })
  }

  const handleUnban = async (): Promise<void> => {
    if (!contextMenu.player || !isRunning) return
    try {
      await unbanPlayer(instanceId, contextMenu.player.userId)
    } catch (e: unknown) {
      alert(`Failed to unban: ${e instanceof Error ? e.message : String(e)}`)
    }
    setContextMenu({ visible: false, x: 0, y: 0, player: null })
  }

  useEffect(() => {
    const handleClick = (): void => {
      if (contextMenu.visible) setContextMenu((prev) => ({ ...prev, visible: false }))
    }
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [contextMenu.visible])

  const fetchPlayers = useCallback(async () => {
    try {
      const data = await getPlayers(instanceId)
      setPlayers(data || [])
    } catch (e) {
      console.error('Failed to fetch players for map:', e)
    }
  }, [instanceId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPlayers()
    const interval = setInterval(fetchPlayers, 5000)
    return () => clearInterval(interval)
  }, [fetchPlayers])

  const mappedPlayers = useMemo(() => {
    return players.filter((p) => {
      if (p.location_x == null || p.location_y == null) return false
      if (p.status === 'online' && !filterOnline) return false
      if (p.status === 'offline' && !filterOffline) return false
      if (p.status === 'banned' && !filterBanned) return false
      return true
    })
  }, [players, filterOnline, filterOffline, filterBanned])

  return (
    <div
      className="tab-pane active full-height"
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', padding: 0 }}
    >
      {/* Map Switcher */}
      <div
        style={{
          position: 'absolute',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          display: 'flex',
          background: 'rgba(20, 26, 35, 0.85)',
          padding: '6px',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}
      >
        <button
          onClick={() => setActiveMap('main')}
          style={{
            background: activeMap === 'main' ? 'var(--accent)' : 'transparent',
            color: activeMap === 'main' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            padding: '8px 24px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            outline: 'none'
          }}
        >
          World Map
        </button>
        <button
          onClick={() => setActiveMap('tree')}
          style={{
            background: activeMap === 'tree' ? 'var(--accent)' : 'transparent',
            color: activeMap === 'tree' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            padding: '8px 24px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            outline: 'none'
          }}
        >
          World Tree
        </button>
      </div>

      {/* Map Filters */}
      <div
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          background: 'rgba(20, 26, 35, 0.85)',
          padding: '16px',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}
      >
        <span
          style={{
            color: 'var(--text-muted)',
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '0.05em',
            marginBottom: '2px'
          }}
        >
          MARKERS
        </span>

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={filterOnline}
            onChange={(e) => setFilterOnline(e.target.checked)}
            style={{ accentColor: '#2ed573', width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span
            style={{
              color: filterOnline ? '#fff' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            Online
          </span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={filterOffline}
            onChange={(e) => setFilterOffline(e.target.checked)}
            style={{ accentColor: '#94a3b8', width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span
            style={{
              color: filterOffline ? '#fff' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            Offline
          </span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={filterBanned}
            onChange={(e) => setFilterBanned(e.target.checked)}
            style={{
              accentColor: 'var(--accent)',
              width: '16px',
              height: '16px',
              cursor: 'pointer'
            }}
          />
          <span
            style={{
              color: filterBanned ? '#fff' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            Banned
          </span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={filterFastTravel}
            onChange={(e) => setFilterFastTravel(e.target.checked)}
            style={{ accentColor: '#00d2d3', width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span
            style={{
              color: filterFastTravel ? '#fff' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            Fast Travel
          </span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={filterBosses}
            onChange={(e) => setFilterBosses(e.target.checked)}
            style={{ accentColor: '#f368e0', width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span
            style={{
              color: filterBosses ? '#fff' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            Bosses
          </span>
        </label>
      </div>

      <div
        style={{
          flex: 1,
          backgroundColor: '#0a0a0a',
          zIndex: 1,
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      >
        <MapContainer
          crs={L.CRS.Simple}
          bounds={[
            [0, 0],
            [-256, 256]
          ]}
          minZoom={0}
          maxZoom={7}
          style={{ height: '100%', width: '100%', outline: 'none' }}
        >
          <MapUpdater mapId={activeMap} />
          <CoordDisplay mapId={activeMap} />
          <ZoomTracker setMapZoom={setMapZoom} />

          <TileLayer
            url={`/tiles/${activeMap}/{z}/{y}/{x}.jpg`}
            noWrap={true}
            maxNativeZoom={5}
            bounds={[
              [0, 0],
              [-256, 256]
            ]}
          />

          {filterFastTravel &&
            Object.entries(fastTravelPointsData).map(([guid, ftData]) => {
              const ft = ftData as FastTravelPoint
              const latlng = gameToLatLng(ft.x, ft.y, activeMap)
              const mapX = Math.round(ft.x / 1000)
              const mapY = Math.round(ft.y / 1000)
              return (
                <Marker key={guid} position={latlng} icon={getFastTravelIcon(ft.class)}>
                  <Tooltip direction="top" offset={[0, -16]} className="map-tooltip" opacity={1}>
                    <div style={{ fontWeight: 800 }}>{ft.localized_name}</div>
                  </Tooltip>
                  <Popup className="dark-popup">
                    <div style={{ minWidth: '160px', padding: '0px' }}>
                      <h3
                        style={{
                          margin: '0 0 8px 0',
                          color: '#fff',
                          fontSize: '14px',
                          fontWeight: 800
                        }}
                      >
                        {ft.localized_name}
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <span
                            style={{
                              color: 'var(--text-muted)',
                              fontSize: '9px',
                              fontWeight: 800,
                              letterSpacing: '0.05em',
                              display: 'block',
                              marginBottom: '2px'
                            }}
                          >
                            MAP
                          </span>
                          <span
                            style={{
                              color: 'var(--accent)',
                              fontSize: '12px',
                              fontFamily: 'monospace',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopy(`${mapX} ${mapY}`, `map_${guid}`)
                            }}
                            title="Copy Map Coords"
                          >
                            {copiedId === `map_${guid}` ? 'Copied!' : `${mapX} ${mapY}`}
                          </span>
                        </div>
                        <div>
                          <span
                            style={{
                              color: 'var(--text-muted)',
                              fontSize: '9px',
                              fontWeight: 800,
                              letterSpacing: '0.05em',
                              display: 'block',
                              marginBottom: '2px'
                            }}
                          >
                            WORLD
                          </span>
                          <span
                            style={{
                              color: '#fff',
                              fontSize: '12px',
                              fontFamily: 'monospace',
                              fontWeight: 500
                            }}
                          >
                            {Math.round(ft.x)} {Math.round(ft.y)}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: '1px solid rgba(255,255,255,0.1)'
                        }}
                      >
                        <span
                          style={{
                            color: 'var(--text-muted)',
                            fontSize: '9px',
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            display: 'block',
                            marginBottom: '2px'
                          }}
                        >
                          ID
                        </span>
                        <span
                          style={{
                            color: '#fff',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                            cursor: 'pointer'
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopy(ft.id, `id_${guid}`)
                          }}
                          title="Copy ID"
                        >
                          {copiedId === `id_${guid}` ? 'Copied!' : ft.id}
                        </span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}

          {filterBosses &&
            Object.values(bossesData).map((bossData: unknown) => {
              const boss = bossData as BossData
              const latlng = gameToLatLng(boss.x, boss.y, activeMap)
              const mapX = Math.round(boss.x / 1000)
              const mapY = Math.round(boss.y / 1000)
              if (boss.localized_name === 'None' || boss.character_id === 'BOSS_None') return null
              return (
                <Marker
                  key={boss.spawner_id}
                  position={latlng}
                  icon={getBossIcon(boss.character_id, mapZoom)}
                >
                  <Tooltip direction="top" offset={[0, -18]} className="map-tooltip" opacity={1}>
                    <div style={{ fontWeight: 800 }}>{boss.localized_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Level {boss.level}
                    </div>
                  </Tooltip>
                  <Popup className="dark-popup">
                    <div style={{ minWidth: '160px', padding: '0px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: '8px',
                          marginBottom: '8px'
                        }}
                      >
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '14px', fontWeight: 800 }}>
                          {boss.localized_name}
                        </h3>
                        <span
                          style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}
                        >
                          Lv.{boss.level}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <span
                            style={{
                              color: 'var(--text-muted)',
                              fontSize: '9px',
                              fontWeight: 800,
                              letterSpacing: '0.05em',
                              display: 'block',
                              marginBottom: '2px'
                            }}
                          >
                            MAP
                          </span>
                          <span
                            style={{
                              color: 'var(--accent)',
                              fontSize: '12px',
                              fontFamily: 'monospace',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopy(`${mapX} ${mapY}`, `map_${boss.spawner_id}`)
                            }}
                            title="Copy Map Coords"
                          >
                            {copiedId === `map_${boss.spawner_id}` ? 'Copied!' : `${mapX} ${mapY}`}
                          </span>
                        </div>
                        <div>
                          <span
                            style={{
                              color: 'var(--text-muted)',
                              fontSize: '9px',
                              fontWeight: 800,
                              letterSpacing: '0.05em',
                              display: 'block',
                              marginBottom: '2px'
                            }}
                          >
                            WORLD
                          </span>
                          <span
                            style={{
                              color: '#fff',
                              fontSize: '12px',
                              fontFamily: 'monospace',
                              fontWeight: 500
                            }}
                          >
                            {Math.round(boss.x)} {Math.round(boss.y)}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: '1px solid rgba(255,255,255,0.1)'
                        }}
                      >
                        <span
                          style={{
                            color: 'var(--text-muted)',
                            fontSize: '9px',
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            display: 'block',
                            marginBottom: '2px'
                          }}
                        >
                          ID
                        </span>
                        <span
                          style={{
                            color: '#fff',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                            cursor: 'pointer'
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopy(boss.character_id, `id_${boss.spawner_id}`)
                          }}
                          title="Copy ID"
                        >
                          {copiedId === `id_${boss.spawner_id}` ? 'Copied!' : boss.character_id}
                        </span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}

          {mappedPlayers.map((p) => {
            const latlng = gameToLatLng(p.location_x!, p.location_y!, activeMap)
            const icon =
              p.status === 'online'
                ? playerIcon
                : p.status === 'banned'
                  ? bannedPlayerIcon
                  : offlinePlayerIcon

            return (
              <Marker
                key={p.userId}
                position={latlng}
                icon={icon}
                eventHandlers={{
                  contextmenu: (e) => {
                    L.DomEvent.preventDefault(e.originalEvent)
                    L.DomEvent.stopPropagation(e.originalEvent)
                    if (!isRunning) {
                      alert('Start the server first')
                      return
                    }
                    setContextMenu({
                      visible: true,
                      x: e.originalEvent.clientX,
                      y: e.originalEvent.clientY,
                      player: p
                    })
                  }
                }}
              >
                <Tooltip direction="top" offset={[0, -20]} className="map-tooltip" opacity={1}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 800 }}>{p.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600 }}>
                      Lv.{p.level > 0 ? p.level : '?'}
                    </span>
                    <span
                      style={{
                        color:
                          p.status === 'online'
                            ? '#2ed573'
                            : p.status === 'banned'
                              ? '#ff4757'
                              : '#94a3b8',
                        fontSize: '9px',
                        fontWeight: 800,
                        letterSpacing: '0.05em'
                      }}
                    >
                      {p.status.toUpperCase()}
                    </span>
                  </div>
                </Tooltip>
                <Popup className="dark-popup">
                  <div style={{ minWidth: '240px', padding: '0px' }}>
                    {/* Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '15px', fontWeight: 800 }}>
                          {p.name}
                        </h3>
                        <span
                          style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}
                        >
                          Lv.{p.level > 0 ? p.level : '?'}
                        </span>
                      </div>
                      <span
                        style={{
                          background:
                            p.status === 'online'
                              ? 'rgba(46, 213, 115, 0.2)'
                              : 'rgba(255, 255, 255, 0.1)',
                          color: p.status === 'online' ? '#2ed573' : 'var(--text-muted)',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          fontSize: '9px',
                          fontWeight: 800,
                          letterSpacing: '0.05em'
                        }}
                      >
                        {p.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Compact IDs & Ping */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        marginBottom: '10px'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: 'rgba(255,255,255,0.03)',
                          padding: '4px 6px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        title="Click to copy"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (p.playerId) handleCopy(p.playerId, `playerId-${p.userId}`)
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')
                        }
                      >
                        <span
                          style={{
                            color: 'var(--text-secondary)',
                            fontSize: '10px',
                            fontWeight: 600
                          }}
                        >
                          Player ID
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span
                            style={{
                              color:
                                copiedId === `playerId-${p.userId}` ? '#2ed573' : 'var(--accent)',
                              fontSize: '10px',
                              fontFamily: 'monospace'
                            }}
                          >
                            {p.playerId || 'N/A'}
                          </span>
                          {copiedId === `playerId-${p.userId}` ? (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#2ed573"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          ) : (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ opacity: 0.5 }}
                            >
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: 'rgba(255,255,255,0.03)',
                          padding: '4px 6px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        title="Click to copy"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (p.userId) handleCopy(p.userId, `userId-${p.userId}`)
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')
                        }
                      >
                        <span
                          style={{
                            color: 'var(--text-secondary)',
                            fontSize: '10px',
                            fontWeight: 600
                          }}
                        >
                          User ID
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span
                            style={{
                              color: copiedId === `userId-${p.userId}` ? '#2ed573' : '#fff',
                              fontSize: '10px',
                              fontFamily: 'monospace'
                            }}
                          >
                            {p.userId}
                          </span>
                          {copiedId === `userId-${p.userId}` ? (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#2ed573"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          ) : (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ opacity: 0.5 }}
                            >
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Compact Coords */}
                    <div
                      style={{
                        background: 'rgba(0,0,0,0.3)',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span
                          style={{
                            color: 'var(--text-muted)',
                            fontSize: '9px',
                            fontWeight: 800,
                            letterSpacing: '0.05em'
                          }}
                        >
                          MAP COORDS
                        </span>
                        <span
                          style={{
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 700,
                            fontFamily: 'monospace'
                          }}
                        >
                          {Math.round(p.location_y! / 1000)}, {Math.round(p.location_x! / 1000)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span
                          style={{
                            color: 'var(--text-muted)',
                            fontSize: '9px',
                            fontWeight: 800,
                            letterSpacing: '0.05em'
                          }}
                        >
                          WORLD
                        </span>
                        <span
                          style={{
                            color: 'var(--text-secondary)',
                            fontSize: '10px',
                            fontWeight: 500,
                            fontFamily: 'monospace'
                          }}
                        >
                          {Math.round(p.location_x!)}, {Math.round(p.location_y!)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      {contextMenu.visible && contextMenu.player && isRunning && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 99999,
            background: 'rgba(20, 26, 35, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '4px',
            minWidth: '140px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(16px)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.player.status === 'online' && (
            <>
              <button className="context-menu-item" onClick={handleKick}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Kick Player
              </button>
              <button
                className="context-menu-item"
                onClick={handleBan}
                style={{ color: '#ff4757' }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
                Ban Player
              </button>
            </>
          )}
          {contextMenu.player.status === 'offline' && (
            <button className="context-menu-item" onClick={handleBan} style={{ color: '#ff4757' }}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              Ban Player
            </button>
          )}
          {contextMenu.player.status === 'banned' && (
            <button
              className="context-menu-item"
              onClick={handleUnban}
              style={{ color: '#2ed573' }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Unban Player
            </button>
          )}
        </div>
      )}
    </div>
  )
}
