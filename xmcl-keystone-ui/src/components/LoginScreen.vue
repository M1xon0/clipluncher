<template>
  <div class="login-screen">
    <div class="login-card">
      <div class="logo-section">
        <div class="logo-icon">⚡</div>
        <h1 class="brand-name">ClipSMP</h1>
        <p class="brand-subtitle">Minecraft Launcher</p>
      </div>

      <!-- Account history -->
      <div v-if="users.length > 0 && !showAddAccount" class="account-history">
        <h3 class="section-title">Select Account</h3>
        <div class="account-list">
          <div
            v-for="user in users"
            :key="user.id"
            class="account-item"
            :class="{ active: user.id === currentUser?.id }"
            @click="onSwitchUser(user.id)"
          >
            <div class="account-avatar">
              <img
                v-if="user.profileTextures?.skin?.url"
                :src="user.profileTextures.skin.url"
                :alt="user.username"
                class="skin-head"
              />
              <div v-else class="avatar-placeholder">{{ user.username[0].toUpperCase() }}</div>
            </div>
            <div class="account-info">
              <span class="account-name">{{ user.username }}</span>
              <span class="account-type">{{ user.type === 'microsoft' ? 'Microsoft' : user.type === 'yggdrasil' ? 'Mojang' : 'Offline' }}</span>
            </div>
            <div class="account-status" v-if="user.id === currentUser?.id">✓</div>
          </div>
        </div>
        <button class="btn btn-secondary" @click="showAddAccount = true">+ Add Account</button>
        <button class="btn btn-primary" @click="onContinue" :disabled="!currentUser">
          Continue
        </button>
      </div>

      <!-- Login form -->
      <div v-else class="login-form">
        <!-- Login type tabs -->
        <div class="login-tabs">
          <button
            class="tab-btn"
            :class="{ active: loginType === 'microsoft' }"
            @click="loginType = 'microsoft'"
          >
            Microsoft
          </button>
          <button
            class="tab-btn"
            :class="{ active: loginType === 'yggdrasil' }"
            @click="loginType = 'yggdrasil'"
          >
            Mojang
          </button>
          <button
            class="tab-btn"
            :class="{ active: loginType === 'offline' }"
            @click="loginType = 'offline'"
          >
            Offline
          </button>
        </div>

        <!-- Microsoft login -->
        <div v-if="loginType === 'microsoft'" class="login-content">
          <p class="login-description">
            Sign in with your Microsoft account (Xbox). A browser window will open.
          </p>
          <button class="btn btn-primary microsoft-btn" @click="onLogin" :disabled="isLoading">
            <span v-if="isLoading">Waiting for browser...</span>
            <span v-else>🔑 Sign in with Microsoft</span>
          </button>
        </div>

        <!-- Yggdrasil login -->
        <div v-else-if="loginType === 'yggdrasil'" class="login-content">
          <p class="login-description">Sign in with your Mojang account (legacy).</p>
          <input
            v-model="username"
            type="email"
            placeholder="Email"
            class="input-field"
            :disabled="isLoading"
          />
          <input
            v-model="password"
            type="password"
            placeholder="Password"
            class="input-field"
            :disabled="isLoading"
            @keydown.enter="onLogin"
          />
          <button class="btn btn-primary" @click="onLogin" :disabled="isLoading || !username || !password">
            <span v-if="isLoading">Logging in...</span>
            <span v-else>Login</span>
          </button>
        </div>

        <!-- Offline login -->
        <div v-else class="login-content">
          <p class="login-description">Play without a real account (limited features).</p>
          <input
            v-model="username"
            type="text"
            placeholder="Username"
            class="input-field"
            :disabled="isLoading"
            maxlength="16"
            @keydown.enter="onLogin"
          />
          <button class="btn btn-primary" @click="onLogin" :disabled="isLoading || !username">
            <span v-if="isLoading">Setting up...</span>
            <span v-else>Play Offline</span>
          </button>
        </div>

        <!-- Error message -->
        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <!-- Back button if there are existing accounts -->
        <button
          v-if="users.length > 0"
          class="btn btn-ghost"
          @click="showAddAccount = false"
        >
          ← Back
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { UserProfile } from '../../../xmcl-runtime-api/types/user'

const props = defineProps<{
  users: UserProfile[]
  currentUser: UserProfile | null
  isLoading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  login: [type: string, username?: string, password?: string]
  switchUser: [userId: string]
  continue: []
}>()

const loginType = ref<'microsoft' | 'yggdrasil' | 'offline'>('microsoft')
const username = ref('')
const password = ref('')
const showAddAccount = ref(props.users.length === 0)

function onLogin() {
  emit('login', loginType.value, username.value || undefined, password.value || undefined)
}

function onSwitchUser(userId: string) {
  emit('switchUser', userId)
}

function onContinue() {
  emit('continue')
}
</script>

<style scoped>
.login-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
}

.login-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 40px;
  width: 400px;
  max-width: 95vw;
}

.logo-section {
  text-align: center;
  margin-bottom: 32px;
}

.logo-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.brand-name {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin: 0;
  letter-spacing: 2px;
}

.brand-subtitle {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  margin: 4px 0 0;
}

.section-title {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 12px;
}

.account-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.account-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.account-item:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.account-item.active {
  border-color: #7c3aed;
  background: rgba(124, 58, 237, 0.1);
}

.account-avatar {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.skin-head {
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: pixelated;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: #7c3aed;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 16px;
}

.account-info {
  flex: 1;
  min-width: 0;
}

.account-name {
  display: block;
  color: #fff;
  font-weight: 500;
  font-size: 14px;
}

.account-type {
  display: block;
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
}

.account-status {
  color: #7c3aed;
  font-weight: 700;
}

.login-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  background: rgba(0, 0, 0, 0.2);
  padding: 4px;
  border-radius: 8px;
}

.tab-btn {
  flex: 1;
  padding: 8px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.tab-btn.active {
  background: rgba(124, 58, 237, 0.4);
  color: #fff;
}

.login-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-description {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  margin: 0;
}

.input-field {
  width: 100%;
  padding: 12px 14px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.input-field:focus {
  border-color: #7c3aed;
}

.input-field::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.btn {
  width: 100%;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 4px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #7c3aed;
  color: #fff;
}

.btn-primary:not(:disabled):hover {
  background: #6d28d9;
  transform: translateY(-1px);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.12);
}

.btn-ghost {
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
  padding: 8px;
}

.btn-ghost:hover {
  color: rgba(255, 255, 255, 0.7);
}

.microsoft-btn {
  background: #0078d4;
}

.microsoft-btn:not(:disabled):hover {
  background: #006cbd;
}

.error-message {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
}
</style>
