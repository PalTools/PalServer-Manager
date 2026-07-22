import { existsSync, createWriteStream, mkdirSync, readFileSync, unlinkSync, chmodSync } from 'fs'
import { join } from 'path'
import { spawn } from 'child_process'
import { STEAMCMD_URL, GAME_APP_ID } from '../core/types'
import { get } from 'https'

import { isLinux } from '../core/types'

let steamCmdDir = ''
let steamCmdExe = ''
let queueTail: Promise<void> = Promise.resolve()

export function initSteamCmd(dataRoot: string): void {
  steamCmdDir = join(dataRoot, 'steamcmd')
  steamCmdExe = join(steamCmdDir, isLinux ? 'steamcmd.sh' : 'steamcmd.exe')
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = queueTail.then(fn, fn)
  queueTail = result.then(
    () => {},
    () => {}
  )
  return result
}

function downloadFile(
  url: string,
  dest: string,
  onProgress?: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest)
    get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close()
        unlinkSync(dest)
        downloadFile(res.headers.location, dest, onProgress).then(resolve, reject)
        return
      }

      const total = parseInt(res.headers['content-length'] || '0', 10)
      let downloaded = 0

      res.on('data', (chunk) => {
        downloaded += chunk.length
        if (total > 0 && onProgress) {
          onProgress((downloaded / total) * 100)
        }
      })

      res.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      file.close()
      reject(err)
    })
  })
}

function runSteamCmdRaw(
  args: string[],
  log?: (msg: string) => void,
  onProgress?: (stage: string, percent: number) => void
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(steamCmdExe, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: isLinux
    })

    let stdoutBuf = ''
    child.stdout?.on('data', (data: Buffer) => {
      stdoutBuf += data.toString()

      if (onProgress) {
        const matches = [
          ...stdoutBuf.matchAll(/Update state \([^)]+\) ([^,]+), progress: ([0-9.]+)/g)
        ]
        if (matches.length > 0) {
          const lastMatch = matches[matches.length - 1]
          onProgress(lastMatch[1], parseFloat(lastMatch[2]))
        }

        const selfMatches = [...stdoutBuf.matchAll(/\[\s*([0-9.]+)%\]\s+([^(\n]+)/g)]
        if (selfMatches.length > 0) {
          const lastMatch = selfMatches[selfMatches.length - 1]
          onProgress(`SteamCMD ${lastMatch[2].trim()}`, parseFloat(lastMatch[1]))
        }
      }

      let newlineIdx
      while ((newlineIdx = stdoutBuf.search(/[\r\n]/)) !== -1) {
        const line = stdoutBuf.slice(0, newlineIdx).trim()
        stdoutBuf = stdoutBuf.slice(newlineIdx + 1)
        if (line) {
          log?.(`[SteamCMD] ${line}`)
        }
      }
    })

    let stderrBuf = ''
    child.stderr?.on('data', (data: Buffer) => {
      stderrBuf += data.toString()
      let newlineIdx
      while ((newlineIdx = stderrBuf.search(/[\r\n]/)) !== -1) {
        const line = stderrBuf.slice(0, newlineIdx).trim()
        stderrBuf = stderrBuf.slice(newlineIdx + 1)
        if (line) log?.(`[SteamCMD ERR] ${line}`)
      }
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (stdoutBuf.trim()) log?.(`[SteamCMD] ${stdoutBuf.trim()}`)
      if (stderrBuf.trim()) log?.(`[SteamCMD ERR] ${stderrBuf.trim()}`)
      resolve(code ?? 1)
    })
  })
}

async function ensureSteamCmd(
  log?: (msg: string) => void,
  onProgress?: (stage: string, percent: number) => void
): Promise<void> {
  if (existsSync(steamCmdExe)) return

  try {
    mkdirSync(steamCmdDir, { recursive: true })
  } catch (err) {
    log?.(`Failed to create steamCmdDir: ${err instanceof Error ? err.message : String(err)}`)
  }
  const archiveExt = isLinux ? 'tar.gz' : 'zip'
  const archivePath = join(steamCmdDir, `steamcmd.${archiveExt}`)

  log?.('SteamCMD not found. Downloading...')
  await downloadFile(STEAMCMD_URL, archivePath, (pct) =>
    onProgress?.('SteamCMD downloading...', pct)
  )

  log?.('Extracting SteamCMD...')
  onProgress?.('SteamCMD extracting...', 0)
  await new Promise<void>((resolve, reject) => {
    if (isLinux) {
      const child = spawn('tar', ['-xzf', archivePath, '-C', steamCmdDir])
      child.on('close', (code) => {
        if (code === 0) {
          try {
            chmodSync(steamCmdExe, 0o755)
          } catch (err) {
            console.error('Failed to chmod steamcmd.sh:', err)
          }
          resolve()
        } else reject(new Error(`tar extraction failed with code ${code}`))
      })
      child.on('error', reject)
    } else {
      const child = spawn('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Expand-Archive -Path "${archivePath}" -DestinationPath "${steamCmdDir}" -Force`
      ])
      child.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`Expand-Archive failed with code ${code}`))
      })
      child.on('error', reject)
    }
  })
  onProgress?.('SteamCMD extracting...', 100)

  if (existsSync(archivePath)) unlinkSync(archivePath)
  log?.('SteamCMD installed.')

  log?.('SteamCMD initialization started...')
  await runSteamCmdRaw(['+login', 'anonymous', '+quit'], log, onProgress)
  log?.('SteamCMD initialization finished.')
}

export function installOrUpdate(
  installDir: string,
  log?: (msg: string) => void,
  onProgress?: (stage: string, percent: number) => void
): Promise<number> {
  return enqueue(async () => {
    await ensureSteamCmd(log, onProgress)
    try {
      mkdirSync(installDir, { recursive: true })
    } catch (err) {
      log?.(`Failed to create installDir: ${err instanceof Error ? err.message : String(err)}`)
    }
    log?.(`Installing/updating app ${GAME_APP_ID} into ${installDir}...`)
    const code = await runSteamCmdRaw(
      [
        '+login',
        'anonymous',
        '+force_install_dir',
        installDir,
        '+app_update',
        GAME_APP_ID,
        '+quit'
      ],
      log,
      onProgress
    )
    log?.(code === 0 ? 'Install/update complete.' : `SteamCMD exited with code ${code}`)
    return code
  })
}

export function extractBuildId(filePath: string): string | null {
  if (!existsSync(filePath)) return null
  const content = readFileSync(filePath, 'utf-8')
  for (const line of content.split('\n')) {
    if (line.includes('"buildid"')) {
      const parts = line.split('"')
      if (parts.length >= 4) return parts[3]
    }
  }
  return null
}

async function fetchRemoteBuildId(): Promise<string> {
  let outputBuf = ''
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      steamCmdExe,
      [
        '+login',
        'anonymous',
        '+app_info_update',
        GAME_APP_ID,
        '+app_info_print',
        GAME_APP_ID,
        '+logoff',
        '+quit'
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    )
    child.stdout?.on('data', (d: Buffer) => {
      outputBuf += d.toString()
    })
    child.stderr?.on('data', (d: Buffer) => {
      outputBuf += d.toString()
    })
    child.on('error', reject)
    child.on('close', () => resolve())
  })
  return outputBuf
}

export function checkForUpdate(
  installDir: string,
  log?: (msg: string) => void
): Promise<{ needsUpdate: boolean; currentBuildId: string | null; remoteBuildId: string | null }> {
  return enqueue(async () => {
    await ensureSteamCmd(log)

    const steamappsDir = join(installDir, 'steamapps')
    try {
      mkdirSync(steamappsDir, { recursive: true })
    } catch (err) {
      log?.(`Failed to create steamappsDir: ${err instanceof Error ? err.message : String(err)}`)
    }
    const buildIdOutputFile = join(installDir, 'buildid_output.log')
    const appManifest = join(steamappsDir, `appmanifest_${GAME_APP_ID}.acf`)

    log?.('Checking for update...')

    const outputBuf = await fetchRemoteBuildId()

    const { writeFileSync } = await import('fs')
    try {
      writeFileSync(buildIdOutputFile, outputBuf, 'utf-8')
    } catch (err) {
      log?.(
        `Failed to write buildIdOutputFile: ${err instanceof Error ? err.message : String(err)}`
      )
    }

    const remoteBuildId = extractBuildId(buildIdOutputFile)
    const currentBuildId = extractBuildId(appManifest)

    log?.(`[BuildID] Current: ${currentBuildId} | Remote: ${remoteBuildId}`)

    if (existsSync(buildIdOutputFile)) {
      try {
        unlinkSync(buildIdOutputFile)
      } catch (err) {
        log?.(
          `Failed to unlink buildIdOutputFile: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    return {
      needsUpdate: remoteBuildId !== null && currentBuildId !== remoteBuildId,
      currentBuildId,
      remoteBuildId
    }
  })
}
