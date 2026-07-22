import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  setSettingValues,
  getAllSettings,
  getSettingValue
} from '../../../src/main/services/server/iniConfig'
import { writeFileSync, existsSync, rmSync, mkdirSync, readFileSync } from 'fs'
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

    const simulatedAppUpdates = { ...initialSettings }
    simulatedAppUpdates['ServerName'] = `"${initialSettings['ServerName']}"`
    simulatedAppUpdates['ServerDescription'] = `"${initialSettings['ServerDescription']}"`
    simulatedAppUpdates['AdminPassword'] = `"${initialSettings['AdminPassword']}"`

    setSettingValues(iniPath, simulatedAppUpdates)

    const roundTripSettings = getAllSettings(iniPath)

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

  it('should parse and serialize DenyTechnologyList in double double-quotes format correctly', () => {
    const raw = `[/Script/Pal.PalGameWorldSettings]
OptionSettings=(Difficulty=None,DenyTechnologyList=(""BaseCampBattleDirector"",""BaseCampWorkHard""),GuildRejoinCooldownMinutes=0)
`
    writeFileSync(iniPath, raw, 'utf-8')
    const settings = getAllSettings(iniPath)
    expect(settings['DenyTechnologyList']).toBe('(""BaseCampBattleDirector"",""BaseCampWorkHard"")')
    expect(settings['Difficulty']).toBe('None')
    expect(settings['GuildRejoinCooldownMinutes']).toBe('0')

    const updates = {
      Difficulty: 'None',
      DenyTechnologyList: '(""BaseCampBattleDirector"",""BaseCampWorkHard"",""BaseCampWorkHard"")',
      GuildRejoinCooldownMinutes: '0'
    }
    setSettingValues(iniPath, updates)

    const updatedSettings = getAllSettings(iniPath)
    expect(updatedSettings['DenyTechnologyList']).toBe(
      '(""BaseCampBattleDirector"",""BaseCampWorkHard"",""BaseCampWorkHard"")'
    )
    expect(updatedSettings['Difficulty']).toBe('None')
    expect(updatedSettings['GuildRejoinCooldownMinutes']).toBe('0')
    expect(updatedSettings['BaseCampWorkHard']).toBeUndefined()
  })

  it('should copy and merge configuration from server default template if target file is missing', () => {
    const templateContent = `; Sample comment template
[/Script/Pal.PalGameWorldSettings]
OptionSettings=(Difficulty=None,ExpRate=1.000000,PalCaptureRate=1.000000)
`
    const defaultTemplatePath = join(tempDir, 'DefaultPalWorldSettings.ini')
    writeFileSync(defaultTemplatePath, templateContent, 'utf-8')

    const targetFilePath = join(
      tempDir,
      'Pal',
      'Saved',
      'Config',
      'WindowsServer',
      'PalWorldSettings.ini'
    )

    setSettingValues(targetFilePath, {
      Difficulty: 'Hard',
      PalCaptureRate: '2.000000'
    })

    expect(existsSync(targetFilePath)).toBe(true)

    const fileContent = readFileSync(targetFilePath, 'utf-8')
    expect(fileContent).toContain('; Sample comment template')
    expect(fileContent).toContain('Difficulty=Hard')
    expect(fileContent).toContain('ExpRate=1.000000')
    expect(fileContent).toContain('PalCaptureRate=2.000000')
  })

  it('should update from default template if target file exists but is empty', () => {
    const templateContent = `; Default Template
[/Script/Pal.PalGameWorldSettings]
OptionSettings=(Difficulty=None,ExpRate=1.000000,DenyTechnologyList=)
`
    const defaultTemplatePath = join(tempDir, 'DefaultPalWorldSettings.ini')
    writeFileSync(defaultTemplatePath, templateContent, 'utf-8')

    const targetFilePath = join(
      tempDir,
      'Pal',
      'Saved',
      'Config',
      'WindowsServer',
      'PalWorldSettings.ini'
    )
    mkdirSync(join(tempDir, 'Pal', 'Saved', 'Config', 'WindowsServer'), { recursive: true })
    writeFileSync(targetFilePath, '', 'utf-8')

    setSettingValues(targetFilePath, {
      Difficulty: 'Hard'
    })

    const fileContent = readFileSync(targetFilePath, 'utf-8')
    expect(fileContent).toContain('; Default Template')
    expect(fileContent).toContain('Difficulty=Hard')
    expect(fileContent).toContain('ExpRate=1.000000')
  })

  it('should preserve setting keys when updated with empty string values', () => {
    const raw = `[/Script/Pal.PalGameWorldSettings]
OptionSettings=(Difficulty=None,DenyTechnologyList=(""BaseCampBattleDirector""),PublicIP="127.0.0.1")
`
    writeFileSync(iniPath, raw, 'utf-8')
    setSettingValues(iniPath, {
      DenyTechnologyList: ''
    })

    const updatedContent = readFileSync(iniPath, 'utf-8')
    expect(updatedContent).toContain('DenyTechnologyList=')
    expect(getAllSettings(iniPath)['DenyTechnologyList']).toBe('')
  })
})
