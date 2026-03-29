import { ref, onMounted, onUnmounted } from 'vue'
import type { ModInfo, ModSyncStatus } from '../../../xmcl-runtime-api/types/mods'

export function useModSync() {
  const syncStatus = ref<ModSyncStatus>({
    state: 'idle',
    progress: 0,
    total: 0,
  })
  const installedMods = ref<ModInfo[]>([])
  const error = ref<string | null>(null)

  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    // Listen for status updates from main process
    if (window.clipsmp?.mods) {
      unsubscribe = window.clipsmp.mods.onStatusChanged((status) => {
        syncStatus.value = status as ModSyncStatus
      })

      // Load initial status and mods
      loadStatus()
      loadInstalledMods()
    }
  })

  onUnmounted(() => {
    unsubscribe?.()
  })

  async function loadStatus() {
    try {
      const status = await window.clipsmp.mods.getStatus()
      syncStatus.value = status as ModSyncStatus
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function loadInstalledMods() {
    try {
      const mods = await window.clipsmp.mods.getInstalled()
      installedMods.value = mods as ModInfo[]
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function syncMods() {
    error.value = null
    try {
      const mods = await window.clipsmp.mods.sync()
      installedMods.value = mods as ModInfo[]
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    }
  }

  const isSyncing = () =>
    syncStatus.value.state === 'checking' || syncStatus.value.state === 'downloading'

  const syncProgress = () => {
    const { progress, total } = syncStatus.value
    if (total === 0) return 0
    return Math.round((progress / total) * 100)
  }

  return {
    syncStatus,
    installedMods,
    error,
    isSyncing,
    syncProgress,
    syncMods,
    loadInstalledMods,
  }
}
