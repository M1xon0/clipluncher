// Mod types for ClipSMP Launcher

export interface ModInfo {
  id: string
  name: string
  version: string
  author: string
  description?: string
  fileName: string
  sha256: string
  downloadUrl: string
  size: number
}

export interface ModSyncStatus {
  state: 'idle' | 'checking' | 'downloading' | 'installing' | 'complete' | 'error'
  progress: number
  total: number
  currentFile?: string
  error?: string
}

export interface ModRepository {
  mods: ModInfo[]
  lastUpdated: string
  branch: string
  commit: string
}
