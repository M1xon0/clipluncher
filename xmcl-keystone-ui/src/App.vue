<template>
  <div id="app">
    <LoginScreen
      v-if="!isLoggedIn"
      :users="users"
      :current-user="currentUser"
      :is-loading="authLoading"
      :error="authError"
      @login="onLogin"
      @switch-user="switchUser"
      @continue="onContinue"
    />
    <LauncherScreen
      v-else
      :current-user="currentUser"
      :installed-mods="installedMods"
      :sync-status="syncStatus"
      :sync-error="syncError"
      :launch-state="launchState"
      :launch-error="launchError"
      :is-syncing="isSyncing"
      :sync-progress="syncProgress"
      :is-running="isRunning"
      :status-label="statusLabel"
      @sync-mods="syncMods"
      @launch-game="launchGame"
      @stop-game="stopGame"
      @switch-account="showLogin"
      @logout="onLogout"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoginScreen from './components/LoginScreen.vue'
import LauncherScreen from './components/LauncherScreen.vue'
import { useAuth } from './composables/useAuth'
import { useModSync } from './composables/useModSync'
import { useLaunch } from './composables/useLaunch'
import type { LoginOptions } from '../../xmcl-runtime-api/types/user'

const {
  currentUser,
  users,
  isLoading: authLoading,
  error: authError,
  isLoggedIn,
  loadState,
  login,
  logout,
  switchUser,
} = useAuth()

const {
  syncStatus,
  installedMods,
  error: syncError,
  isSyncing,
  syncProgress,
  syncMods,
} = useModSync()

const {
  launchState,
  error: launchError,
  isRunning,
  statusLabel,
  launchGame,
  stopGame,
} = useLaunch()

onMounted(async () => {
  await loadState()

  // Auto-sync mods when logged in
  if (isLoggedIn.value) {
    syncMods().catch(() => {
      // Non-fatal - user can manually sync
    })
  }
})

async function onLogin(type: string, username?: string, password?: string) {
  const options: LoginOptions = {
    type: type as 'microsoft' | 'yggdrasil' | 'offline',
    username,
    password,
  }

  try {
    await login(options)
    // Auto-sync after login
    syncMods().catch(() => {})
  } catch {
    // Error already in authError
  }
}

function onContinue() {
  if (currentUser.value) {
    // Auto-sync on continue
    syncMods().catch(() => {})
  }
}

function showLogin() {
  // This triggers the LoginScreen by clearing the logged-in state
  logout(currentUser.value?.id)
}

async function onLogout() {
  await logout()
}
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: #0f0c29;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  color: #fff;
}

#app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
