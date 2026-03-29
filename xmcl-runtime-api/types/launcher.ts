// Launcher types for ClipSMP Launcher

export interface LaunchOptions {
  userId: string
  minecraftVersion: string
  modLoader: 'neoforge'
  modLoaderVersion?: string
  gameDir: string
  javaPath?: string
  maxMemory?: number
  minMemory?: number
}

export interface LaunchState {
  status: 'idle' | 'preparing' | 'launching' | 'running' | 'stopped' | 'error'
  pid?: number
  error?: string
  startTime?: number
}

export interface NeoForgeVersion {
  minecraftVersion: string
  neoforgeVersion: string
  releaseDate: string
  stable: boolean
}
