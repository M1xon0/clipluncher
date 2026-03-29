<template>
  <div class="account-info">
    <div class="avatar-container">
      <img
        v-if="user.profileTextures?.skin?.url"
        :src="user.profileTextures.skin.url"
        :alt="user.username"
        class="avatar-img"
      />
      <div v-else class="avatar-placeholder">
        {{ user.username[0].toUpperCase() }}
      </div>
    </div>

    <div class="user-details">
      <span class="username">{{ user.username }}</span>
      <span class="account-type">
        {{ user.type === 'microsoft' ? '🔑 Microsoft' : user.type === 'yggdrasil' ? '☕ Mojang' : '🎮 Offline' }}
      </span>
    </div>

    <div class="account-actions">
      <button class="action-btn" @click="$emit('switchAccount')" title="Switch Account">
        Switch
      </button>
      <button class="action-btn danger" @click="$emit('logout')" title="Logout">
        Logout
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UserProfile } from '../../../xmcl-runtime-api/types/user'

defineProps<{
  user: UserProfile
}>()

defineEmits<{
  switchAccount: []
  logout: []
}>()
</script>

<style scoped>
.account-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
}

.avatar-container {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: pixelated;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 18px;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.username {
  display: block;
  color: #fff;
  font-weight: 600;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.account-type {
  display: block;
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  margin-top: 2px;
}

.account-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.action-btn {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}

.action-btn.danger:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}
</style>
