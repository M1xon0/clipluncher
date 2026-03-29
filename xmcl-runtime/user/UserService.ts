import { UserProfile, LoginOptions, AuthState } from '../../../xmcl-runtime-api/types/user'
import { YggdrasilAccountSystem } from './YggdrasilAccountSystem'
import { MicrosoftAccountSystem } from './MicrosoftAccountSystem'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as crypto from 'crypto'

export class UserService {
  private usersDir: string
  private profilesFile: string
  private state: AuthState = {
    currentUser: null,
    users: [],
    isLoading: false,
    error: null,
  }

  private yggdrasil = new YggdrasilAccountSystem()
  private microsoft = new MicrosoftAccountSystem()

  constructor(gameDir?: string) {
    const baseDir = gameDir || path.join(os.homedir(), '.minecraft-clipsmp')
    this.usersDir = path.join(baseDir, 'users')
    this.profilesFile = path.join(this.usersDir, 'profiles.json')
    this.ensureDirectories()
    this.loadProfiles()
  }

  private ensureDirectories(): void {
    fs.mkdirSync(this.usersDir, { recursive: true })
  }

  private loadProfiles(): void {
    try {
      if (fs.existsSync(this.profilesFile)) {
        const data = JSON.parse(fs.readFileSync(this.profilesFile, 'utf-8'))
        this.state.users = data.users || []
        const currentId = data.currentUserId
        if (currentId) {
          this.state.currentUser = this.state.users.find((u) => u.id === currentId) || null
        }
      }
    } catch {
      this.state.users = []
      this.state.currentUser = null
    }
  }

  private saveProfiles(): void {
    const data = {
      currentUserId: this.state.currentUser?.id,
      users: this.state.users,
    }
    fs.writeFileSync(this.profilesFile, JSON.stringify(data, null, 2), 'utf-8')
  }

  getState(): AuthState {
    return { ...this.state }
  }

  async login(options: LoginOptions): Promise<UserProfile> {
    this.state.isLoading = true
    this.state.error = null

    try {
      let profile: UserProfile

      if (options.type === 'microsoft') {
        profile = await this.microsoft.login()
      } else if (options.type === 'yggdrasil') {
        if (!options.username || !options.password) {
          throw new Error('Username and password required for Yggdrasil login')
        }
        profile = await this.yggdrasil.login(options.username, options.password)
      } else {
        // Offline mode
        if (!options.username) {
          throw new Error('Username required for offline mode')
        }
        profile = {
          id: crypto.randomUUID(),
          username: options.username,
          uuid: crypto.randomUUID(),
          accessToken: 'offline',
          clientToken: crypto.randomUUID(),
          type: 'offline',
        }
      }

      // Update or add user
      const existing = this.state.users.findIndex((u) => u.id === profile.id)
      if (existing >= 0) {
        this.state.users[existing] = profile
      } else {
        this.state.users.push(profile)
      }

      this.state.currentUser = profile
      this.saveProfiles()
      return profile
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.state.error = message
      throw err
    } finally {
      this.state.isLoading = false
    }
  }

  async refreshToken(userId: string): Promise<UserProfile | null> {
    const user = this.state.users.find((u) => u.id === userId)
    if (!user) return null

    try {
      let refreshed: UserProfile | null = null

      if (user.type === 'microsoft') {
        refreshed = await this.microsoft.refresh(user)
      } else if (user.type === 'yggdrasil') {
        refreshed = await this.yggdrasil.refresh(user)
      } else {
        return user
      }

      if (refreshed) {
        const idx = this.state.users.findIndex((u) => u.id === userId)
        if (idx >= 0) {
          this.state.users[idx] = refreshed
        }
        if (this.state.currentUser?.id === userId) {
          this.state.currentUser = refreshed
        }
        this.saveProfiles()
      }

      return refreshed
    } catch {
      return null
    }
  }

  switchUser(userId: string): boolean {
    const user = this.state.users.find((u) => u.id === userId)
    if (!user) return false
    this.state.currentUser = user
    this.saveProfiles()
    return true
  }

  logout(userId?: string): void {
    const targetId = userId || this.state.currentUser?.id
    if (!targetId) return

    this.state.users = this.state.users.filter((u) => u.id !== targetId)
    if (this.state.currentUser?.id === targetId) {
      this.state.currentUser = this.state.users[0] || null
    }
    this.saveProfiles()
  }

  getCurrentUser(): UserProfile | null {
    return this.state.currentUser
  }

  getAllUsers(): UserProfile[] {
    return [...this.state.users]
  }
}
