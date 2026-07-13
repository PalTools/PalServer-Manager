/**
 * settings.ts — App-level settings (data root, default instance location).
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { AppSettings } from '../../services/core/types'

const SETTINGS_FILE = 'app-settings.json'

function defaultDataRoot(): string {
  return app.getPath('userData')
}

let cachedSettings: AppSettings | null = null

export function getSettings(): AppSettings {
  if (cachedSettings) return cachedSettings

  const dataRoot = defaultDataRoot()
  const settingsPath = join(dataRoot, SETTINGS_FILE)

  if (existsSync(settingsPath)) {
    try {
      cachedSettings = JSON.parse(readFileSync(settingsPath, 'utf-8'))
      return cachedSettings!
    } catch {
      // Fall through to defaults
    }
  }

  cachedSettings = {
    dataRoot,
    defaultInstanceRoot: join(dataRoot, 'Servers')
  }
  saveSettings(cachedSettings)
  return cachedSettings
}

export function saveSettings(settings: AppSettings): void {
  mkdirSync(settings.dataRoot, { recursive: true })
  const settingsPath = join(settings.dataRoot, SETTINGS_FILE)
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
  cachedSettings = settings
}

export function getDataRoot(): string {
  return getSettings().dataRoot
}
