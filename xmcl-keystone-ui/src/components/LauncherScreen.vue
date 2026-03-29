<template>
  <div class="launcher-screen">
    <!-- Custom title bar -->
    <div class="title-bar">
      <div class="title-bar-drag">
        <span class="title-bar-logo">⚡</span>
        <span class="title-bar-name">ClipSMP Launcher</span>
      </div>
      <div class="title-bar-controls">
        <button class="title-btn" @click="onMinimize">─</button>
        <button class="title-btn" @click="onMaximize">□</button>
        <button class="title-btn close" @click="onClose">✕</button>
      </div>
    </div>

    <!-- Main layout -->
    <div class="launcher-layout">
      <!-- Sidebar -->
      <div class="sidebar">
        <!-- Account Info -->
        <AccountInfo
          v-if="currentUser"
          :user="currentUser"
          @switch-account="$emit('switchAccount')"
          @logout="$emit('logout')"
        />

        <!-- Sync status / progress -->
        <div class="sync-panel">
          <div class="sync-header">
            <span class="panel-title">Mod Sync</span>
            <span class="sync-state" :class="syncStatusClass">{{ syncStateLabel }}</span>
          </div>

          <div v-if="isSyncing()" class="progress-bar-container">
            <div class="progress-bar" :style="{ width: syncProgress() + '%' }"></div>
            <span class="progress-text">{{ syncProgress() }}%</span>
          </div>

          <p v-if="syncStatus.currentFile" class="sync-file">{{ syncStatus.currentFile }}</p>
          <p v-if="syncError" class="sync-error">{{ syncError }}</p>

          <button
            v-if="syncStatus.state === 'idle' || syncStatus.state === 'error' || syncStatus.state === 'complete'"
            class="btn-sync"
            @click="onSyncMods"
            :disabled="isSyncing()"
          >
            🔄 Sync Mods
          </button>
        </div>

        <!-- Mod list -->
        <div class="sidebar-mods">
          <ModList :mods="installedMods" />
        </div>
      </div>

      <!-- Main area -->
      <div class="main-area">
        <!-- Background art -->
        <div class="bg-art">
          <div class="bg-particles"></div>
          <div class="bg-logo">
            <div class="logo-glow">⚡</div>
            <h1 class="main-logo-text">ClipSMP</h1>
            <p class="main-logo-subtitle">NeoForge 1.21.1</p>
          </div>
        </div>

        <!-- Launch area -->
        <div class="launch-area">
          <!-- Error display -->
          <div v-if="launchError" class="launch-error">
            ⚠️ {{ launchError }}
          </div>

          <!-- Status indicator -->
          <div class="game-status" :class="statusClass">
            <div class="status-dot"></div>
            <span>{{ statusLabel() }}</span>
          </div>

          <!-- Launch / Stop button -->
          <button
            v-if="!isRunning()"
            class="launch-btn"
            @click="onLaunch"
            :disabled="launchState.status === 'preparing' || launchState.status === 'launching' || syncStatus.state === 'downloading'"
          >
            <span v-if="launchState.status === 'preparing' || launchState.status === 'launching'">
              ⏳ Launching...
            </span>
            <span v-else>▶ LAUNCH GAME</span>
          </button>

          <button v-else class="stop-btn" @click="onStop">
            ■ Stop Game
          </button>

          <!-- Server info -->
          <p class="server-info">Server: {{ serverIp }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AccountInfo from './AccountInfo.vue'
import ModList from './ModList.vue'
import type { UserProfile } from '../../../xmcl-runtime-api/types/user'
import type { ModInfo, ModSyncStatus } from '../../../xmcl-runtime-api/types/mods'
import type { LaunchState } from '../../../xmcl-runtime-api/types/launcher'

const SERVER_IP = 'placeholder.example.com:25565'

const props = defineProps<{
  currentUser: UserProfile | null
  installedMods: ModInfo[]
  syncStatus: ModSyncStatus
  syncError: string | null
  launchState: LaunchState
  launchError: string | null
  isSyncing: () => boolean
  syncProgress: () => number
  isRunning: () => boolean
  statusLabel: () => string
}>()

const emit = defineEmits<{
  syncMods: []
  launchGame: []
  stopGame: []
  switchAccount: []
  logout: []
}>()

const serverIp = SERVER_IP

const syncStatusClass = computed(() => {
  switch (props.syncStatus.state) {
    case 'complete':
      return 'status-ok'
    case 'error':
      return 'status-err'
    case 'idle':
      return 'status-idle'
    default:
      return 'status-busy'
  }
})

const syncStateLabel = computed(() => {
  switch (props.syncStatus.state) {
    case 'idle':
      return 'Ready'
    case 'checking':
      return 'Checking...'
    case 'downloading':
      return `Downloading (${props.syncStatus.progress}/${props.syncStatus.total})`
    case 'installing':
      return 'Installing...'
    case 'complete':
      return 'Up to date'
    case 'error':
      return 'Error'
    default:
      return 'Unknown'
  }
})

const statusClass = computed(() => {
  switch (props.launchState.status) {
    case 'running':
      return 'running'
    case 'launching':
    case 'preparing':
      return 'busy'
    case 'error':
      return 'error'
    default:
      return 'idle'
  }
})

function onSyncMods() {
  emit('syncMods')
}

function onLaunch() {
  emit('launchGame')
}

function onStop() {
  emit('stopGame')
}

function onMinimize() {
  window.clipsmp?.window.minimize()
}

function onMaximize() {
  window.clipsmp?.window.maximize()
}

function onClose() {
  window.clipsmp?.window.close()
}
</script>

<style scoped>
.launcher-screen {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0f0c29;
  color: #fff;
  overflow: hidden;
  user-select: none;
}

/* Title bar */
.title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 38px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  -webkit-app-region: drag;
  flex-shrink: 0;
}

.title-bar-drag {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-bar-logo {
  font-size: 14px;
}

.title-bar-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
}

.title-bar-controls {
  display: flex;
  gap: 2px;
  -webkit-app-region: no-drag;
}

.title-btn {
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.title-btn.close:hover {
  background: rgba(239, 68, 68, 0.7);
  color: #fff;
}

/* Layout */
.launcher-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 300px;
  min-width: 260px;
  background: rgba(0, 0, 0, 0.25);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  overflow-y: auto;
}

.panel-title {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Sync panel */
.sync-panel {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sync-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sync-state {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}

.status-ok {
  background: rgba(52, 211, 153, 0.15);
  color: #34d399;
}

.status-err {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.status-idle {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.4);
}

.status-busy {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
}

.progress-bar-container {
  position: relative;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #7c3aed, #4f46e5);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  right: 0;
  top: -14px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

.sync-file {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sync-error {
  font-size: 11px;
  color: #f87171;
  margin: 0;
}

.btn-sync {
  padding: 6px 12px;
  background: rgba(124, 58, 237, 0.15);
  border: 1px solid rgba(124, 58, 237, 0.3);
  border-radius: 6px;
  color: #c4b5fd;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  align-self: flex-start;
}

.btn-sync:hover:not(:disabled) {
  background: rgba(124, 58, 237, 0.25);
}

.btn-sync:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Mods sidebar section */
.sidebar-mods {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Main area */
.main-area {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding: 24px;
  overflow: hidden;
}

.bg-art {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 60%, #1a0533 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.bg-logo {
  text-align: center;
  pointer-events: none;
}

.logo-glow {
  font-size: 80px;
  filter: drop-shadow(0 0 30px rgba(124, 58, 237, 0.8));
  animation: pulse 3s infinite;
}

@keyframes pulse {
  0%, 100% { filter: drop-shadow(0 0 30px rgba(124, 58, 237, 0.8)); }
  50% { filter: drop-shadow(0 0 50px rgba(124, 58, 237, 1)); }
}

.main-logo-text {
  font-size: 64px;
  font-weight: 900;
  letter-spacing: 8px;
  color: #fff;
  text-shadow: 0 0 40px rgba(124, 58, 237, 0.6);
  margin: 0;
}

.main-logo-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 4px;
  margin: 8px 0 0;
}

/* Launch area */
.launch-area {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 400px;
}

.launch-error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13px;
  width: 100%;
  text-align: center;
}

.game-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
}

.game-status.running .status-dot {
  background: #34d399;
  box-shadow: 0 0 8px rgba(52, 211, 153, 0.8);
  animation: blink 1.5s infinite;
}

.game-status.busy .status-dot {
  background: #fbbf24;
  animation: blink 0.8s infinite;
}

.game-status.error .status-dot {
  background: #f87171;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.launch-btn {
  width: 100%;
  padding: 18px 32px;
  background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 24px rgba(124, 58, 237, 0.4);
}

.launch-btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(124, 58, 237, 0.6);
}

.launch-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.stop-btn {
  width: 100%;
  padding: 18px 32px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  color: #fca5a5;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.stop-btn:hover {
  background: rgba(239, 68, 68, 0.25);
}

.server-info {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.2);
  margin: 0;
  letter-spacing: 1px;
}
</style>
