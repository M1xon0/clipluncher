<template>
  <div class="mod-list">
    <div class="mod-list-header">
      <h3 class="section-title">Installed Mods</h3>
      <span class="mod-count">{{ mods.length }} mod{{ mods.length !== 1 ? 's' : '' }}</span>
    </div>

    <div v-if="mods.length === 0" class="empty-state">
      <div class="empty-icon">📦</div>
      <p>No mods installed yet.</p>
      <p class="empty-hint">Mods will be downloaded automatically.</p>
    </div>

    <div v-else class="mods-container">
      <div v-for="mod in mods" :key="mod.id" class="mod-item">
        <div class="mod-icon">🧩</div>
        <div class="mod-info">
          <span class="mod-name">{{ mod.name }}</span>
          <span class="mod-meta">
            <span v-if="mod.version !== 'unknown'" class="mod-version">v{{ mod.version }}</span>
            <span v-if="mod.author && mod.author !== 'ClipSMP'" class="mod-author">by {{ mod.author }}</span>
          </span>
        </div>
        <div class="mod-size">{{ formatSize(mod.size) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ModInfo } from '../../../xmcl-runtime-api/types/mods'

defineProps<{
  mods: ModInfo[]
}>()

function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<style scoped>
.mod-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.mod-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.section-title {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0;
}

.mod-count {
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: rgba(255, 255, 255, 0.3);
  text-align: center;
  gap: 4px;
  padding: 20px;
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.empty-hint {
  font-size: 12px !important;
  color: rgba(255, 255, 255, 0.2) !important;
}

.mods-container {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 4px;
}

.mods-container::-webkit-scrollbar {
  width: 4px;
}

.mods-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}

.mods-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}

.mod-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
}

.mod-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.mod-info {
  flex: 1;
  min-width: 0;
}

.mod-name {
  display: block;
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mod-meta {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.mod-version {
  color: #7c3aed;
  font-size: 11px;
}

.mod-author {
  color: rgba(255, 255, 255, 0.3);
  font-size: 11px;
}

.mod-size {
  color: rgba(255, 255, 255, 0.25);
  font-size: 11px;
  flex-shrink: 0;
}
</style>
