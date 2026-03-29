// User types for ClipSMP Launcher

export interface UserProfile {
  id: string
  username: string
  uuid: string
  accessToken: string
  clientToken: string
  type: 'microsoft' | 'yggdrasil' | 'offline'
  profileTextures?: ProfileTextures
  expiresAt?: number
}

export interface ProfileTextures {
  skin?: {
    url: string
    metadata?: { model: 'slim' | 'classic' }
  }
  cape?: {
    url: string
  }
}

export interface LoginOptions {
  type: 'microsoft' | 'yggdrasil' | 'offline'
  username?: string
  password?: string
}

export interface AuthState {
  currentUser: UserProfile | null
  users: UserProfile[]
  isLoading: boolean
  error: string | null
}
