import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  setSettingValues,
  getAllSettings,
  getSettingValue
} from '../../../src/main/services/server/iniConfig'
import { writeFileSync, existsSync, rmSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

describe('iniConfig.ts - INI Parser/Stringifier', () => {
  let tempDir: string
  let iniPath: string

  beforeEach(() => {
    tempDir = join(tmpdir(), 'palserver-tests-config', randomUUID())
    mkdirSync(tempDir, { recursive: true })
    iniPath = join(tempDir, 'PalWorldSettings.ini')
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should parse quoted strings with commas and spaces', () => {
    const raw = `[/Script/Pal.PalGameWorldSettings]
OptionSettings=(ServerName="My Awesome Server, Hosted Here",Difficulty=None)
`
    writeFileSync(iniPath, raw, 'utf-8')
    const settings = getAllSettings(iniPath)
    expect(settings['ServerName']).toBe('My Awesome Server, Hosted Here')
    expect(settings['Difficulty']).toBe('None')
  })

  it('should handle nested OptionSettings=(...) blocks', () => {
    const raw = `[/Script/Pal.PalGameWorldSettings]
OptionSettings=(Nested=(A=1,B=2),Difficulty=None)
`
    writeFileSync(iniPath, raw, 'utf-8')
    const settings = getAllSettings(iniPath)
    expect(settings['Nested']).toBe('(A=1,B=2)')
    expect(settings['Difficulty']).toBe('None')
  })

  it('should perform a double round-trip stability test (parse(stringify(parse(x))) === parse(x))', () => {
    const raw = `[/Script/Pal.PalGameWorldSettings]
OptionSettings=(Difficulty=None,ServerName="Default Palworld Server",ServerDescription="A, B, C",AdminPassword="admin,pass",PublicPort=8211,bUseAuth=True)
`
    writeFileSync(iniPath, raw, 'utf-8')
    const initialSettings = getAllSettings(iniPath)

    // Simulate what the application does: wrap strings that the schema says require quotes
    const simulatedAppUpdates = { ...initialSettings }
    simulatedAppUpdates['ServerName'] = `"${initialSettings['ServerName']}"`
    simulatedAppUpdates['ServerDescription'] = `"${initialSettings['ServerDescription']}"`
    simulatedAppUpdates['AdminPassword'] = `"${initialSettings['AdminPassword']}"`

    // Stringify back
    setSettingValues(iniPath, simulatedAppUpdates)

    // Parse again
    const roundTripSettings = getAllSettings(iniPath)

    // Compare
    expect(roundTripSettings).toEqual(initialSettings)
  })

  it('getSettingValue should extract a specific value', () => {
    const raw = `[/Script/Pal.PalGameWorldSettings]
OptionSettings=(ServerName="Test Server",PublicPort=8211)
`
    writeFileSync(iniPath, raw, 'utf-8')
    expect(getSettingValue(iniPath, 'ServerName')).toBe('Test Server')
    expect(getSettingValue(iniPath, 'PublicPort')).toBe('8211')
    expect(getSettingValue(iniPath, 'Missing')).toBe(null)
  })
})
