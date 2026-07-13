import { describe, it, expect, vi } from 'vitest'
import { resolveSafePath } from '../../../src/main/ipcs/server/fs'

vi.mock('electron', () => ({
  shell: {
    showItemInFolder: vi.fn(),
    openPath: vi.fn()
  },
  dialog: {
    showOpenDialog: vi.fn()
  },
  ipcMain: {
    handle: vi.fn()
  }
}))
import { resolve } from 'path'

describe('file-manager - unit', () => {
  it('path traversal protection with hostile input', () => {
    const installPath = 'C:\\PalServer\\Instance'

    // Valid path
    expect(resolveSafePath(installPath, 'Config/PalWorldSettings.ini')).toBe(
      resolve(installPath, 'Config/PalWorldSettings.ini')
    )

    // Hostile inputs
    expect(() => resolveSafePath(installPath, '../../etc/passwd')).toThrow(
      'Path traversal detected'
    )
    expect(() => resolveSafePath(installPath, '..\\..\\Windows\\System32')).toThrow(
      'Path traversal detected'
    )
    expect(() => resolveSafePath(installPath, 'C:\\Windows\\System32')).toThrow(
      'Path traversal detected'
    )
    expect(() => resolveSafePath(installPath, '/etc/passwd')).toThrow('Path traversal detected')
  })
})
