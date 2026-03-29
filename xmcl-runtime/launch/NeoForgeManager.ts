import * as https from 'https'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const NEOFORGE_VERSIONS_URL = 'https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge'

interface NeoForgeVersionList {
  versions: string[]
}

interface NeoForgeVersionInfo {
  minecraftVersion: string
  neoforgeVersion: string
  releaseDate: string
  stable: boolean
}

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'ClipSMP-Launcher/1.0',
        Accept: 'application/json',
      },
    }

    const req = https.request(options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const location = res.headers.location
        if (location) {
          resolve(httpsGet(location))
          return
        }
      }

      let data = ''
      res.on('data', (c) => {
        data += c
      })
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data)
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

export class NeoForgeManager {
  private versionsDir: string
  private cachedVersions: NeoForgeVersionInfo[] | null = null

  constructor(gameDir?: string) {
    const base = gameDir || path.join(os.homedir(), '.minecraft-clipsmp')
    this.versionsDir = path.join(base, 'versions')
    fs.mkdirSync(this.versionsDir, { recursive: true })
  }

  async getAvailableVersionsForMC(minecraftVersion: string): Promise<NeoForgeVersionInfo[]> {
    try {
      const data = await httpsGet(NEOFORGE_VERSIONS_URL)
      const parsed = JSON.parse(data) as NeoForgeVersionList

      // NeoForge version format: 21.1.x for MC 1.21.1
      const mcShort = minecraftVersion.replace(/^1\./, '')
      const matching = parsed.versions
        .filter((v) => v.startsWith(mcShort + '.') || v.startsWith(mcShort + '-'))
        .map((v) => ({
          minecraftVersion,
          neoforgeVersion: v,
          releaseDate: new Date().toISOString(),
          stable: !v.includes('beta') && !v.includes('alpha'),
        }))

      return matching
    } catch {
      return []
    }
  }

  async getLatestStableVersion(minecraftVersion: string): Promise<string | null> {
    const versions = await this.getAvailableVersionsForMC(minecraftVersion)
    const stable = versions.filter((v) => v.stable)
    if (!stable.length) return null
    return stable[stable.length - 1].neoforgeVersion
  }

  async isInstalled(minecraftVersion: string, neoforgeVersion: string): Promise<boolean> {
    const versionId = `neoforge-${neoforgeVersion}`
    const versionDir = path.join(this.versionsDir, versionId)
    const versionJson = path.join(versionDir, `${versionId}.json`)
    return fs.existsSync(versionJson)
  }

  getVersionId(neoforgeVersion: string): string {
    return `neoforge-${neoforgeVersion}`
  }

  getVersionDir(neoforgeVersion: string): string {
    return path.join(this.versionsDir, this.getVersionId(neoforgeVersion))
  }
}
