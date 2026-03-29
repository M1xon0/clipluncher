import { contextBridge, ipcRenderer } from 'electron'
import type { LoginOptions } from '../xmcl-runtime-api/types/user'
import type { LaunchOptions } from '../xmcl-runtime-api/types/launcher'

// Expose a safe API to the renderer process
contextBridge.exposeInMainWorld('clipsmp', {
  // Auth
  auth: {
    getState: () => ipcRenderer.invoke('auth:getState'),
    login: (options: LoginOptions) => ipcRenderer.invoke('auth:login', options),
    logout: (userId?: string) => ipcRenderer.invoke('auth:logout', userId),
    switchUser: (userId: string) => ipcRenderer.invoke('auth:switchUser', userId),
    getAllUsers: () => ipcRenderer.invoke('auth:getAllUsers'),
    refreshToken: (userId: string) => ipcRenderer.invoke('auth:refreshToken', userId),
  },

  // Mods
  mods: {
    getStatus: () => ipcRenderer.invoke('mods:getStatus'),
    getInstalled: () => ipcRenderer.invoke('mods:getInstalled'),
    sync: () => ipcRenderer.invoke('mods:sync'),
    onStatusChanged: (callback: (status: unknown) => void) => {
      ipcRenderer.on('mods:statusChanged', (_event, status) => callback(status))
      return () => ipcRenderer.removeAllListeners('mods:statusChanged')
    },
  },

  // Launch
  launch: {
    getState: () => ipcRenderer.invoke('launch:getState'),
    start: (options?: Partial<LaunchOptions>) => ipcRenderer.invoke('launch:start', options || {}),
    stop: () => ipcRenderer.invoke('launch:stop'),
    onStateChanged: (callback: (state: unknown) => void) => {
      ipcRenderer.on('launch:stateChanged', (_event, state) => callback(state))
      return () => ipcRenderer.removeAllListeners('launch:stateChanged')
    },
  },

  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
})
