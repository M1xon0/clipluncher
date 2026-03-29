import { ref, onMounted, onUnmounted } from 'vue'
import type { LaunchState } from '../../../xmcl-runtime-api/types/launcher'

export function useLaunch() {
  const launchState = ref<LaunchState>({ status: 'idle' })
  const error = ref<string | null>(null)

  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    if (window.clipsmp?.launch) {
      unsubscribe = window.clipsmp.launch.onStateChanged((state) => {
        launchState.value = state as LaunchState
        if (launchState.value.error) {
          error.value = launchState.value.error
        }
      })

      loadState()
    }
  })

  onUnmounted(() => {
    unsubscribe?.()
  })

  async function loadState() {
    try {
      const state = await window.clipsmp.launch.getState()
      launchState.value = state as LaunchState
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function launchGame() {
    error.value = null
    try {
      await window.clipsmp.launch.start()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    }
  }

  async function stopGame() {
    try {
      await window.clipsmp.launch.stop()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    }
  }

  const isRunning = () =>
    launchState.value.status === 'running' || launchState.value.status === 'launching'

  const statusLabel = () => {
    switch (launchState.value.status) {
      case 'idle':
        return 'Ready'
      case 'preparing':
        return 'Preparing...'
      case 'launching':
        return 'Launching...'
      case 'running':
        return 'Running'
      case 'stopped':
        return 'Stopped'
      case 'error':
        return 'Error'
      default:
        return 'Unknown'
    }
  }

  return {
    launchState,
    error,
    isRunning,
    statusLabel,
    launchGame,
    stopGame,
  }
}
