# ClipSMP Launcher

A specialized Minecraft launcher for the ClipSMP community, based on [Voxelum/x-minecraft-launcher](https://github.com/Voxelum/x-minecraft-launcher).

## Features

- 🔑 **Microsoft & Mojang Authentication** — Full Yggdrasil/Microsoft OAuth login
- 📦 **Automatic Mod Synchronization** — Mods are auto-downloaded from [`M1xon0/clipluncher-mod`](https://github.com/M1xon0/clipluncher-mod)
- 🔒 **Locked Mod Folder** — Users cannot add, remove, or modify mods
- ⚡ **NeoForge 1.21.1** — Pre-configured mod loader
- 🎮 **One-Click Launch** — Minimal, clean interface focused on getting you into the game

## Technology Stack

- **Electron** — Desktop app framework
- **Vue 3** — Reactive UI
- **TypeScript** — Type-safe codebase
- **pnpm workspaces** — Monorepo package management

## Project Structure

```
clipluncher/
├── xmcl-electron-app/      # Electron main process
│   ├── main.ts             # App entry, IPC handlers
│   └── preload.ts          # Secure context bridge
├── xmcl-keystone-ui/       # Vue 3 UI (renderer process)
│   └── src/
│       ├── App.vue
│       ├── components/
│       │   ├── LoginScreen.vue
│       │   ├── LauncherScreen.vue
│       │   ├── ModList.vue
│       │   └── AccountInfo.vue
│       └── composables/
│           ├── useAuth.ts
│           ├── useModSync.ts
│           └── useLaunch.ts
├── xmcl-runtime/           # Backend services
│   ├── user/               # Authentication
│   ├── mods/               # Mod synchronization
│   └── launch/             # Game launching
├── xmcl-runtime-api/       # Shared TypeScript types
└── config.json             # Launcher configuration
```

## Configuration

Edit `config.json` to set:

```json
{
  "serverIp": "your-server.example.com:25565",
  "modRepoOwner": "M1xon0",
  "modRepoName": "clipluncher-mod",
  "modRepoBranch": "main",
  "minecraftVersion": "1.21.1",
  "modLoader": "neoforge",
  "brand": "ClipSMP"
}
```

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
cd xmcl-electron-app && pnpm dev

# Build
pnpm build
```

## Prerequisites

- Node.js 18+
- pnpm 8+
- Java 21+ (for running Minecraft)

## Mod Repository

Mods are pulled from `M1xon0/clipluncher-mod`. To add mods, push `.jar` files to that repository's `main` branch. The launcher will automatically sync on startup.

## License

MIT License