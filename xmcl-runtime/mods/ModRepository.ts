import { ModInfo } from '../../../xmcl-runtime-api/types/mods'
import * as fs from 'fs'
import * as path from 'path'

interface ModManifest {
  mods: ModInfo[]
  lastUpdated: string
  commit: string
}

export class ModRepository {
  private manifestPath: string
  private modsDir: string

  constructor(gameDir: string) {
    this.modsDir = path.join(gameDir, 'mods')
    this.manifestPath = path.join(gameDir, 'mods-manifest.json')
  }

  saveManifest(mods: ModInfo[], commit: string): void {
    const manifest: ModManifest = {
      mods,
      lastUpdated: new Date().toISOString(),
      commit,
    }
    fs.writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
  }

  loadManifest(): ModManifest | null {
    try {
      if (!fs.existsSync(this.manifestPath)) return null
      return JSON.parse(fs.readFileSync(this.manifestPath, 'utf-8')) as ModManifest
    } catch {
      return null
    }
  }

  getInstalledMods(): ModInfo[] {
    const manifest = this.loadManifest()
    if (!manifest) return []

    // Filter to only files that actually exist
    return manifest.mods.filter((mod) => fs.existsSync(path.join(this.modsDir, mod.fileName)))
  }

  getModsDirectory(): string {
    return this.modsDir
  }
}
