import { ref, computed } from 'vue'
import type { UserProfile, AuthState, LoginOptions } from '../../../xmcl-runtime-api/types/user'

declare global {
  interface Window {
    clipsmp: {
      auth: {
        getState: () => Promise<AuthState>
        login: (options: LoginOptions) => Promise<UserProfile>
        logout: (userId?: string) => Promise<void>
        switchUser: (userId: string) => Promise<boolean>
        getAllUsers: () => Promise<UserProfile[]>
        refreshToken: (userId: string) => Promise<UserProfile | null>
      }
      mods: {
        getStatus: () => Promise<unknown>
        getInstalled: () => Promise<unknown[]>
        sync: () => Promise<unknown[]>
        onStatusChanged: (cb: (status: unknown) => void) => () => void
      }
      launch: {
        getState: () => Promise<unknown>
        start: (options?: object) => Promise<void>
        stop: () => Promise<void>
        onStateChanged: (cb: (state: unknown) => void) => () => void
      }
      window: {
        minimize: () => Promise<void>
        maximize: () => Promise<void>
        close: () => Promise<void>
      }
    }
  }
}

export function useAuth() {
  const currentUser = ref<UserProfile | null>(null)
  const users = ref<UserProfile[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isLoggedIn = computed(() => currentUser.value !== null)

  async function loadState() {
    try {
      const state = await window.clipsmp.auth.getState()
      currentUser.value = state.currentUser
      users.value = state.users
      error.value = state.error
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function login(options: LoginOptions) {
    isLoading.value = true
    error.value = null
    try {
      const profile = await window.clipsmp.auth.login(options)
      currentUser.value = profile
      users.value = await window.clipsmp.auth.getAllUsers()
      return profile
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function logout(userId?: string) {
    isLoading.value = true
    try {
      await window.clipsmp.auth.logout(userId)
      await loadState()
    } finally {
      isLoading.value = false
    }
  }

  async function switchUser(userId: string) {
    const success = await window.clipsmp.auth.switchUser(userId)
    if (success) {
      await loadState()
    }
    return success
  }

  return {
    currentUser,
    users,
    isLoading,
    error,
    isLoggedIn,
    loadState,
    login,
    logout,
    switchUser,
  }
}
