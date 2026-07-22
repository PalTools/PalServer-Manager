import { app, shell, BrowserWindow, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { getDataRoot } from './ipcs/core/settings'
import { initSteamCmd } from './services/engine/steamcmd'
import { InstanceManager } from './services/server/instanceManager'
import { registerInstanceHandlers } from './ipcs/server/instances'
import { registerControlHandlers, stopAllMonitors } from './ipcs/server/control'
import { registerFsHandlers } from './ipcs/server/fs'
import { registerTemplateHandlers } from './ipcs/engine/template'
import { registerPlayerHandlers } from './ipcs/server/players'
import { initLogger } from './services/system/logger'

initLogger()

let mainWindow: BrowserWindow | null = null
let instanceManager: InstanceManager | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    title: 'PalServer Manager',
    show: false,
    autoHideMenuBar: true,
    icon,
    backgroundColor: '#0a0a0f',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0a0a0f',
      symbolColor: '#a0a0b0',
      height: 36
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    try {
      const url = new URL(details.url)
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        shell.openExternal(details.url)
      }
    } catch {
      void 0
    }
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

if (app.isPackaged) {
  app.setName('PalServer Manager')
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('paltools.palservermanager')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (app.isPackaged) {
      const csp =
        "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data:; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.jsdelivr.net https://ipv4.icanhazip.com; worker-src 'self' blob:"

      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [csp]
        }
      })
    } else {
      callback({
        responseHeaders: details.responseHeaders
      })
    }
  })

  const dataRoot = getDataRoot()
  initSteamCmd(dataRoot)
  instanceManager = new InstanceManager(dataRoot)
  instanceManager.loadRegistry()

  registerInstanceHandlers(instanceManager, () => mainWindow)
  registerControlHandlers(instanceManager, () => mainWindow)
  registerFsHandlers(instanceManager)
  registerTemplateHandlers(() => mainWindow)
  registerPlayerHandlers(instanceManager)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', async (event) => {
  if (instanceManager) {
    event.preventDefault()
    stopAllMonitors()
    await instanceManager.stopAll()
    instanceManager = null
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
