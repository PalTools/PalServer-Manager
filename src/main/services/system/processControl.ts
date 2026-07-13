/**
 * backend/processControl.ts — Windows process lookup, kill, memory.
 *
 * Fully asynchronous, uses native commands (tasklist/taskkill) instead of
 * PowerShell/WMI to avoid freezing the Electron main thread.
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { basename } from 'path'
import { isLinux } from '../core/types'

const execAsync = promisify(exec)

/**
 * Fast synchronous liveness check using Node's process.kill(pid, 0).
 */
export function isProcessAlive(pid: number | null | undefined): boolean {
  if (!pid || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (e: unknown) {
    return (e as NodeJS.ErrnoException).code === 'EPERM' // EPERM means it exists but we don't own it. ESRCH means it's dead.
  }
}

/**
 * Ensures the PID belongs to the expected executable name to prevent
 * PID reuse collisions (e.g. if the server crashed and another app took PID).
 */
export async function verifyPid(pid: number, exePath: string): Promise<boolean> {
  if (!isProcessAlive(pid)) return false
  const baseName = basename(exePath).toLowerCase()
  try {
    if (isLinux) {
      const { stdout } = await execAsync(`ps -p ${pid} -o comm=`, { timeout: 3000 })
      const runningExe = stdout.trim().toLowerCase()
      return runningExe.startsWith(baseName) || baseName.startsWith(runningExe)
    } else {
      const { stdout } = await execAsync(`tasklist /fi "PID eq ${pid}" /fo csv /nh`, {
        timeout: 3000
      })
      const match = stdout.match(/^"([^"]+)"/)
      if (match) {
        const runningExe = match[1].toLowerCase()
        return (
          runningExe.startsWith(baseName.substring(0, 20)) ||
          baseName.startsWith(runningExe.substring(0, 20))
        )
      }
    }
    return false
  } catch {
    return false
  }
}

export async function killProcessTree(pid: number | null | undefined): Promise<void> {
  if (!pid || !isProcessAlive(pid)) return
  try {
    if (isLinux) {
      // Kill the entire process group to ensure SteamCMD and PalServer children are cleaned up
      process.kill(-pid, 'SIGKILL')
    } else {
      await execAsync(`taskkill /F /PID ${pid} /T`, { timeout: 5000 })
    }
  } catch {
    // Process may have already exited
  }
}

/**
 * Get formatted memory usage for the process using tasklist. Returns e.g. "1.23 GB" or "456 MB".
 */
export async function getMemoryUsage(pid: number | null | undefined): Promise<string> {
  if (!pid || !isProcessAlive(pid)) return 'N/A'
  try {
    if (isLinux) {
      const { stdout } = await execAsync(`ps -p ${pid} -o rss=`, { timeout: 3000 })
      const kbString = stdout.trim()
      if (kbString) {
        const memMB = parseInt(kbString, 10) / 1024
        if (memMB >= 1024) return `${(memMB / 1024).toFixed(2)} GB`
        return `${memMB.toFixed(2)} MB`
      }
    } else {
      const { stdout } = await execAsync(`tasklist /fi "PID eq ${pid}" /fo csv /nh`, {
        timeout: 3000
      })
      const match = stdout.match(/"([^"]+)"\s*$/)
      if (match) {
        const kbString = match[1].replace(/[^\d]/g, '')
        if (kbString) {
          const memMB = parseInt(kbString, 10) / 1024
          if (memMB >= 1024) return `${(memMB / 1024).toFixed(2)} GB`
          return `${memMB.toFixed(2)} MB`
        }
      }
    }
    return 'N/A'
  } catch {
    return 'N/A'
  }
}

/**
 * State map to track previous CPU time for calculating percentages on Windows
 */
const cpuState = new Map<number, { lastCpuSec: number; lastTimeMs: number }>()

/**
 * Get comprehensive CPU and Memory usage without wmic (broken on Win11).
 */
export async function getProcessUsage(
  pid: number | null | undefined
): Promise<{ cpu: string; memory: string } | null> {
  if (!pid || !isProcessAlive(pid)) {
    if (pid) cpuState.delete(pid)
    return null
  }

  try {
    if (isLinux) {
      const { stdout } = await execAsync(`ps -p ${pid} -o pcpu=,rss=`, { timeout: 3000 })
      const parts = stdout.trim().split(/\s+/)
      if (parts.length >= 2) {
        const cpuPercent = parseFloat(parts[0])
        const memMB = parseInt(parts[1], 10) / 1024
        const memoryStr =
          memMB >= 1024 ? `${(memMB / 1024).toFixed(2)} GB` : `${memMB.toFixed(2)} MB`
        return { cpu: `${Math.round(cpuPercent)}%`, memory: memoryStr }
      }
    } else {
      // Windows: Get-Process provides WorkingSet64 (bytes) and CPU (total CPU time in seconds)
      const { stdout } = await execAsync(
        `powershell -NoProfile -NonInteractive -Command "Get-Process -Id ${pid} | Select-Object WorkingSet64, CPU | ConvertTo-Json"`,
        { timeout: 5000 }
      )
      const data = JSON.parse(stdout.trim())

      const memMB = (data.WorkingSet64 || 0) / 1024 / 1024
      const memoryStr = memMB >= 1024 ? `${(memMB / 1024).toFixed(2)} GB` : `${memMB.toFixed(2)} MB`

      const currentCpuSec = data.CPU || 0
      const nowMs = Date.now()

      let cpuPercent = 0
      const prev = cpuState.get(pid)
      if (prev) {
        const timeDiffSec = (nowMs - prev.lastTimeMs) / 1000
        const cpuDiffSec = currentCpuSec - prev.lastCpuSec
        if (timeDiffSec > 0) {
          cpuPercent = (cpuDiffSec / timeDiffSec) * 100
        }
      }

      cpuState.set(pid, { lastCpuSec: currentCpuSec, lastTimeMs: nowMs })

      return { cpu: `${Math.round(cpuPercent)}%`, memory: memoryStr }
    }
  } catch {
    // ignore
  }
  return null
}

/**
 * Find the process ID of the server by searching WMI for the exact path.
 * Used only as a fallback if the app restarts and loses the cached PID.
 */
export async function findProcessIdByPath(
  exePath: string,
  instanceDir: string
): Promise<number | null> {
  const baseName = basename(exePath)
  const normalizedTarget = instanceDir.toLowerCase().endsWith('\\')
    ? instanceDir.toLowerCase()
    : instanceDir.toLowerCase() + '\\'

  try {
    if (isLinux) {
      // Find matching processes and look at their working directory or command line
      const { stdout } = await execAsync(`pgrep -f "${baseName}"`, { timeout: 5000 })
      const lines = stdout.split('\n')
      for (const line of lines) {
        const pid = parseInt(line.trim(), 10)
        if (isNaN(pid)) continue
        try {
          const { stdout: pwdxOut } = await execAsync(`pwdx ${pid}`)
          const linuxTarget = instanceDir.toLowerCase().endsWith('/')
            ? instanceDir.toLowerCase()
            : instanceDir.toLowerCase() + '/'
          if (pwdxOut.toLowerCase().includes(linuxTarget)) {
            return pid
          }
        } catch (err: unknown) {
          console.error('Failed to fetch Linux process details:', String(err))
        }
      }
    } else {
      const { stdout } = await execAsync(
        `wmic process where "name='${baseName}'" get ProcessId,ExecutablePath /format:csv`,
        { timeout: 5000 }
      )

      const lines = stdout.split('\n')
      for (const line of lines) {
        if (!line.trim() || line.includes('ProcessId')) continue

        const parts = line.trim().split(',')
        if (parts.length >= 3) {
          const foundPath = parts[1].toLowerCase()
          const pid = parseInt(parts[2].trim(), 10)

          if (foundPath.startsWith(normalizedTarget)) {
            return pid
          }
        }
      }
    }
    return null
  } catch {
    return null
  }
}

export async function trimRamUsage(pid: number | null | undefined): Promise<string> {
  if (!pid || !isProcessAlive(pid)) return 'Process not running.'

  if (isLinux) {
    return 'RAM trim not supported on Linux.'
  }

  const psScript = `
    Add-Type -TypeDefinition @"
    using System;
    using System.Runtime.InteropServices;
    public class Win32 {
        [DllImport("psapi.dll")]
        public static extern bool EmptyWorkingSet(IntPtr hProcess);
    }
"@
    function Format-Size([double]$sizeMB) {
        if ($sizeMB -ge 1024) { return '{0:N2} GB' -f ($sizeMB / 1024) }
        else { return '{0:N2} MB' -f $sizeMB }
    }
    $ProgressPreference = 'SilentlyContinue'
    try {
        $proc = Get-Process -Id ${pid} -ErrorAction Stop
        $beforeMB = $proc.WorkingSet64 / 1MB
        [Win32]::EmptyWorkingSet($proc.Handle) | Out-Null
        Start-Sleep -Seconds 1
        $proc.Refresh()
        $afterMB = $proc.WorkingSet64 / 1MB
        $beforeFormatted = Format-Size $beforeMB
        $afterFormatted = Format-Size $afterMB
        Write-Output "Trimmed RAM: $beforeFormatted -> $afterFormatted"
    } catch {
        Write-Output "Error: $($_.Exception.Message)"
    }
  `

  try {
    const b64 = Buffer.from(psScript, 'utf16le').toString('base64')
    let { stdout } = await execAsync(
      `powershell -NoProfile -NonInteractive -EncodedCommand ${b64}`,
      {
        encoding: 'utf-8',
        timeout: 10000
      }
    )
    stdout = stdout.replace(/#<\s*CLIXML[\s\S]*?<\/Objs>\s*/gi, '').trim()
    return stdout || 'No output from RAM trim.'
  } catch (err: unknown) {
    return `RAM trim failed: ${err instanceof Error ? err.message : String(err)}`
  }
}
