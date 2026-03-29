// xmcl-runtime-api - Public API for ClipSMP Launcher

export * from './types/user'
export * from './types/mods'
export * from './types/launcher'

export const CLIPSMP_CONFIG = {
  serverIp: 'placeholder.example.com:25565',
  modRepoOwner: 'M1xon0',
  modRepoName: 'clipluncher-mod',
  modRepoBranch: 'main',
  minecraftVersion: '1.21.1',
  modLoader: 'neoforge' as const,
  brand: 'ClipSMP',
  gameDir: '.minecraft-clipsmp',
} as const
