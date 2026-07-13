/**
 * backend/iniConfig.ts — Read/write PalWorldSettings.ini and GameUserSettings.ini
 *
 * Accepts arbitrary file paths so each instance can point at its own configs.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'

/**
 * Robustly parses the comma-separated OptionSettings string, respecting quotes and parentheses.
 */
function parseOptionString(optionString: string): Map<string, string> {
  const map = new Map<string, string>()
  let currentKey = ''
  let currentValue = ''
  let inQuotes = false
  let inParens = 0
  let isParsingValue = false

  for (let i = 0; i < optionString.length; i++) {
    const char = optionString[i]
    if (char === '"' && optionString[i - 1] !== '\\') {
      inQuotes = !inQuotes
      if (isParsingValue) currentValue += char
      else currentKey += char
    } else if (char === '(' && !inQuotes) {
      inParens++
      if (isParsingValue) currentValue += char
      else currentKey += char
    } else if (char === ')' && !inQuotes) {
      inParens--
      if (isParsingValue) currentValue += char
      else currentKey += char
    } else if (char === '=' && !inQuotes && inParens === 0 && !isParsingValue) {
      isParsingValue = true
    } else if (char === ',' && !inQuotes && inParens === 0) {
      if (currentKey) map.set(currentKey.trim(), currentValue.trim())
      currentKey = ''
      currentValue = ''
      isParsingValue = false
    } else {
      if (isParsingValue) currentValue += char
      else currentKey += char
    }
  }
  if (currentKey) map.set(currentKey.trim(), currentValue.trim())
  return map
}

export function setSettingValues(
  filePath: string,
  updates: Record<string, string | null | undefined>
): void {
  mkdirSync(dirname(filePath), { recursive: true })

  let lines: string[] = []
  if (existsSync(filePath)) {
    lines = readFileSync(filePath, 'utf-8').split(/\r?\n/)
  }

  let sectionIdx = -1
  let optionIdx = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === '[/Script/Pal.PalGameWorldSettings]') {
      sectionIdx = i
    } else if (sectionIdx !== -1 && line.startsWith('OptionSettings=')) {
      optionIdx = i
      break
    }
  }

  let optionString = ''
  if (optionIdx !== -1) {
    optionString = lines[optionIdx].slice('OptionSettings='.length).trim()
    if (optionString.startsWith('(') && optionString.endsWith(')')) {
      optionString = optionString.slice(1, -1)
    }
  } else {
    if (sectionIdx === -1) {
      lines.push('[/Script/Pal.PalGameWorldSettings]')
    }
    optionIdx = lines.length
    lines.push('OptionSettings=()')
  }

  const settingsMap = parseOptionString(optionString)

  for (const [k, v] of Object.entries(updates)) {
    if (v === null || v === undefined || v === '') {
      settingsMap.delete(k)
    } else {
      settingsMap.set(k, v)
    }
  }

  const newParts: string[] = []
  for (const [k, v] of settingsMap.entries()) {
    newParts.push(`${k}=${v}`)
  }

  lines[optionIdx] = `OptionSettings=(${newParts.join(',')})`
  writeFileSync(filePath, lines.join('\n'), 'utf-8')
}

/**
 * Parse a value from PalWorldSettings.ini's OptionSettings=(...) block.
 * Mirrors the reference script's `get_setting_value`.
 */
export function getSettingValue(filePath: string, keyword: string): string | null {
  if (!existsSync(filePath)) return null

  const lines = readFileSync(filePath, 'utf-8').split('\n')
  let optionLine: string | null = null
  let inSection = false

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line === '[/Script/Pal.PalGameWorldSettings]') {
      inSection = true
    } else if (inSection && line.startsWith('OptionSettings=')) {
      optionLine = line.slice('OptionSettings='.length).trim()
      break
    }
  }

  if (!optionLine) return null

  // Strip outer parens
  if (optionLine.startsWith('(') && optionLine.endsWith(')')) {
    optionLine = optionLine.slice(1, -1)
  }

  // Parse comma-separated key=value pairs, respecting quoted strings
  const settingsMap = parseOptionString(optionLine)
  const val = settingsMap.get(keyword)
  if (val !== undefined) {
    // Strip surrounding quotes
    return val.replace(/^["']|["']$/g, '')
  }

  return null
}

/**
 * Parses all values from PalWorldSettings.ini's OptionSettings=(...) block.
 */
export function getAllSettings(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {}

  const lines = readFileSync(filePath, 'utf-8').split(/\r?\n/)
  let optionLine: string | null = null
  let inSection = false

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line === '[/Script/Pal.PalGameWorldSettings]') {
      inSection = true
    } else if (inSection && line.startsWith('OptionSettings=')) {
      optionLine = line.slice('OptionSettings='.length).trim()
      break
    }
  }

  if (!optionLine) return {}

  if (optionLine.startsWith('(') && optionLine.endsWith(')')) {
    optionLine = optionLine.slice(1, -1)
  }

  const settingsMap = parseOptionString(optionLine)
  const result: Record<string, string> = {}

  for (const [k, v] of settingsMap.entries()) {
    // Strip surrounding quotes
    result[k] = v.replace(/^["']|["']$/g, '')
  }

  return result
}

/**
 * Parse `DedicatedServerName` from GameUserSettings.ini.
 * Mirrors the reference script's `get_dedicated_name`.
 */
export function getDedicatedName(filePath: string): string {
  if (!existsSync(filePath)) return ''
  const lines = readFileSync(filePath, 'utf-8').split('\n')
  for (const line of lines) {
    if (line.trim().startsWith('DedicatedServerName')) {
      const parts = line.split('=')
      if (parts.length >= 2) return parts.slice(1).join('=').trim()
    }
  }
  return ''
}
