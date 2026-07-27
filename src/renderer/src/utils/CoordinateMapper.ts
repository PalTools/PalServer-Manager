import { LatLng } from 'leaflet'

const MAPS = {
  main: {
    gameXMax: 349400.0,
    gameXMin: -1099400.0,
    gameYMin: -724400.0,
    gameYMax: 724400.0
  },
  tree: {
    gameXMax: 689148.5,
    gameXMin: 347351.5,
    gameYMin: -818197.0,
    gameYMax: -476400.0
  }
}

export function latLngToGame(latLng: LatLng, mapId: 'main' | 'tree'): { x: number; y: number } {
  const map = MAPS[mapId]

  // In CRS.Simple, Leaflet's zoom 0 size is 256x256.
  // Top-left is (0, 0), Bottom-right is (-256, 256)
  // lat is Y-axis (0 to -256), lng is X-axis (0 to 256)

  // Normalize lat and lng to [0, 1] range
  const normY = latLng.lat / -256.0 // 0 (top) to 1 (bottom)
  const normX = latLng.lng / 256.0 // 0 (left) to 1 (right)

  // Game X: top is Max, bottom is Min
  const gameX = map.gameXMax - normY * (map.gameXMax - map.gameXMin)

  // Game Y: left is Min, right is Max
  const gameY = map.gameYMin + normX * (map.gameYMax - map.gameYMin)

  return { x: Math.round(gameX), y: Math.round(gameY) }
}

export function gameToLatLng(gameX: number, gameY: number, mapId: 'main' | 'tree'): LatLng {
  const map = MAPS[mapId]

  const normY = (map.gameXMax - gameX) / (map.gameXMax - map.gameXMin)
  const normX = (gameY - map.gameYMin) / (map.gameYMax - map.gameYMin)

  const lat = normY * -256.0
  const lng = normX * 256.0

  return new LatLng(lat, lng)
}
