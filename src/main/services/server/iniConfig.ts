import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'

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

function getDefaultTemplateLines(filePath: string): string[] {
  const palDir = dirname(dirname(dirname(dirname(filePath))))
  const serverDir = dirname(palDir)
  const defaultTemplate1 = join(serverDir, 'DefaultPalWorldSettings.ini')
  const defaultTemplate2 = join(palDir, 'DefaultPalWorldSettings.ini')
  let templatePath = ''
  if (existsSync(defaultTemplate1)) {
    templatePath = defaultTemplate1
  } else if (existsSync(defaultTemplate2)) {
    templatePath = defaultTemplate2
  }

  if (!templatePath) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { app } = require('electron')
      if (process.resourcesPath) {
        const p = join(process.resourcesPath, 'DefaultPalWorldSettings.ini')
        if (existsSync(p)) templatePath = p
      }
      if (!templatePath && app) {
        const p = join(app.getAppPath(), 'resources', 'DefaultPalWorldSettings.ini')
        if (existsSync(p)) templatePath = p
      }
    } catch {
      void 0
    }
  }

  if (!templatePath) {
    const cwdResource = join(process.cwd(), 'resources', 'DefaultPalWorldSettings.ini')
    if (existsSync(cwdResource)) {
      templatePath = cwdResource
    }
  }

  if (!templatePath) {
    const relativeResource = join(
      __dirname,
      '..',
      '..',
      '..',
      'resources',
      'DefaultPalWorldSettings.ini'
    )
    if (existsSync(relativeResource)) {
      templatePath = relativeResource
    }
  }

  if (templatePath && existsSync(templatePath)) {
    return readFileSync(templatePath, 'utf-8').split(/\r?\n/)
  }

  return []
}

function getIniLines(filePath: string): string[] {
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf-8')
    if (content.trim().length > 0) {
      return content.split(/\r?\n/)
    }
  }
  return getDefaultTemplateLines(filePath)
}

export function setSettingValues(
  filePath: string,
  updates: Record<string, string | null | undefined>
): void {
  mkdirSync(dirname(filePath), { recursive: true })

  const lines = getIniLines(filePath)

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
    if (v === null || v === undefined) {
      settingsMap.delete(k)
    } else {
      settingsMap.set(k, String(v))
    }
  }

  const newParts: string[] = []
  for (const [k, v] of settingsMap.entries()) {
    newParts.push(`${k}=${v}`)
  }

  lines[optionIdx] = `OptionSettings=(${newParts.join(',')})`
  writeFileSync(filePath, lines.join('\n'), 'utf-8')
}

export function getSettingValue(filePath: string, keyword: string): string | null {
  const lines = getIniLines(filePath)
  if (lines.length === 0) return null

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

  if (optionLine.startsWith('(') && optionLine.endsWith(')')) {
    optionLine = optionLine.slice(1, -1)
  }

  const settingsMap = parseOptionString(optionLine)
  const val = settingsMap.get(keyword)
  if (val !== undefined) {
    return val.replace(/^["']|["']$/g, '')
  }

  return null
}

export function getAllSettings(filePath: string): Record<string, string> {
  const lines = getIniLines(filePath)
  if (lines.length === 0) return {}

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
    result[k] = v.replace(/^["']|["']$/g, '')
  }

  return result
}

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
