import { app, BrowserWindow, ipcMain, shell } from 'electron'
import * as path from 'path'
import * as os from 'os'
import { UserService } from '../xmcl-runtime/user/UserService'
import { ModSyncService } from '../xmcl-runtime/mods/ModSyncService'
import { ModRepository } from '../xmcl-runtime/mods/ModRepository'
import { GameLauncher } from '../xmcl-runtime/launch/GameLauncher'
import { CLIPSMP_CONFIG } from '../xmcl-runtime-api/index'
import type { LoginOptions } from '../xmcl-runtime-api/types/user'
import type { LaunchOptions } from '../xmcl-runtime-api/types/launcher'

const GAME_DIR = path.join(os.homedir(), CLIPSMP_CONFIG.gameDir)

// Initialize services
const userService = new UserService(GAME_DIR)
const modSyncService = new ModSyncService(
  GAME_DIR,
  CLIPSMP_CONFIG.modRepoOwner,
  CLIPSMP_CONFIG.modRepoName,
  CLIPSMP_CONFIG.modRepoBranch,
)
const modRepository = new ModRepository(GAME_DIR)
const gameLauncher = new GameLauncher()

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    minWidth: 900,
    minHeight: 550,
    frame: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#1a1a2e',
    show: false,
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../xmcl-keystone-ui/dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Register IPC handlers

// Auth handlers
ipcMain.handle('auth:getState', () => userService.getState())
ipcMain.handle('auth:login', async (_event, options: LoginOptions) => userService.login(options))
ipcMain.handle('auth:logout', (_event, userId?: string) => userService.logout(userId))
ipcMain.handle('auth:switchUser', (_event, userId: string) => userService.switchUser(userId))
ipcMain.handle('auth:getAllUsers', () => userService.getAllUsers())
ipcMain.handle('auth:refreshToken', (_event, userId: string) => userService.refreshToken(userId))

// Mod sync handlers
ipcMain.handle('mods:getStatus', () => modSyncService.getStatus())
ipcMain.handle('mods:getInstalled', () => modRepository.getInstalledMods())
ipcMain.handle('mods:sync', async () => {
  const mods = await modSyncService.sync()
  modRepository.saveManifest(mods, 'latest')
  return mods
})

// Game launcher handlers
ipcMain.handle('launch:getState', () => gameLauncher.getState())
ipcMain.handle('launch:start', async (_event, options: LaunchOptions) => {
  const user = userService.getCurrentUser()
  if (!user) throw new Error('No user logged in')

  const launchOptions: LaunchOptions = {
    ...options,
    userId: user.id,
    gameDir: GAME_DIR,
    minecraftVersion: CLIPSMP_CONFIG.minecraftVersion,
    modLoader: CLIPSMP_CONFIG.modLoader,
  }

  return gameLauncher.launch(launchOptions, user)
})
ipcMain.handle('launch:stop', () => gameLauncher.stopGame())

// Window controls
ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.handle('window:close', () => mainWindow?.close())

// Push state changes to renderer
modSyncService.onStatusChange((status) => {
  mainWindow?.webContents.send('mods:statusChanged', status)
})

gameLauncher.onStateChange((state) => {
  mainWindow?.webContents.send('launch:stateChanged', state)
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
