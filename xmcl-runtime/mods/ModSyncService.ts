import { ModInfo, ModSyncStatus } from '../../../xmcl-runtime-api/types/mods'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'

const GITHUB_API_BASE = 'https://api.github.com'

interface GitHubTreeItem {
  path: string
  type: string
  sha: string
  size?: number
  url: string
  download_url?: string
}

interface GitHubTree {
  sha: string
  tree: GitHubTreeItem[]
}

interface GitHubCommit {
  sha: string
  commit: {
    author: { date: string }
  }
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
        Accept: 'application/vnd.github.v3+json',
      },
    }

    const req = https.request(options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
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

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath)

    const doRequest = (requestUrl: string) => {
      const urlObj = new URL(requestUrl)
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'ClipSMP-Launcher/1.0',
        },
      }

      const req = https.request(options, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
          const location = res.headers.location
          if (location) {
            doRequest(location)
            return
          }
        }

        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Failed to download: HTTP ${res.statusCode}`))
          return
        }

        res.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve()
        })
        file.on('error', (err) => {
          file.close()
          try { fs.unlinkSync(destPath) } catch { /* ignore */ }
          reject(err)
        })
      })

      req.on('error', reject)
      req.end()
    }

    doRequest(url)
  })
}

export class ModSyncService {
  private modsDir: string
  private repoOwner: string
  private repoName: string
  private repoBranch: string
  private statusListeners: Array<(status: ModSyncStatus) => void> = []
  private currentStatus: ModSyncStatus = {
    state: 'idle',
    progress: 0,
    total: 0,
  }

  constructor(gameDir: string, repoOwner: string, repoName: string, repoBranch = 'main') {
    this.modsDir = path.join(gameDir, 'mods')
    this.repoOwner = repoOwner
    this.repoName = repoName
    this.repoBranch = repoBranch
    this.ensureDirectories()
  }

  private ensureDirectories(): void {
    fs.mkdirSync(this.modsDir, { recursive: true })
  }

  onStatusChange(listener: (status: ModSyncStatus) => void): () => void {
    this.statusListeners.push(listener)
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener)
    }
  }

  private updateStatus(status: Partial<ModSyncStatus>): void {
    this.currentStatus = { ...this.currentStatus, ...status }
    this.statusListeners.forEach((l) => l(this.currentStatus))
  }

  getStatus(): ModSyncStatus {
    return { ...this.currentStatus }
  }

  async fetchRemoteMods(): Promise<ModInfo[]> {
    const latestCommitUrl =
      `${GITHUB_API_BASE}/repos/${this.repoOwner}/${this.repoName}/commits?` +
      `sha=${this.repoBranch}&per_page=1`

    const commitsData = await httpsGet(latestCommitUrl)
    const commits = JSON.parse(commitsData) as GitHubCommit[]
    if (!commits.length) return []

    const latestSha = commits[0].sha

    const treeUrl =
      `${GITHUB_API_BASE}/repos/${this.repoOwner}/${this.repoName}/git/trees/${latestSha}?recursive=1`
    const treeData = await httpsGet(treeUrl)
    const tree = JSON.parse(treeData) as GitHubTree

    const jarFiles = tree.tree.filter(
      (item) => item.type === 'blob' && item.path.endsWith('.jar'),
    )

    return jarFiles.map((item) => ({
      id: item.sha,
      name: path.basename(item.path, '.jar'),
      version: 'unknown',
      author: 'ClipSMP',
      fileName: path.basename(item.path),
      sha256: item.sha,
      downloadUrl: `https://raw.githubusercontent.com/${this.repoOwner}/${this.repoName}/${this.repoBranch}/${item.path}`,
      size: item.size || 0,
    }))
  }

  async getLocalMods(): Promise<string[]> {
    try {
      const files = fs.readdirSync(this.modsDir)
      return files.filter((f) => f.endsWith('.jar'))
    } catch {
      return []
    }
  }

  async sync(): Promise<ModInfo[]> {
    this.updateStatus({ state: 'checking', progress: 0, total: 0 })

    let remoteMods: ModInfo[]
    try {
      remoteMods = await this.fetchRemoteMods()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.updateStatus({ state: 'error', error: `Failed to fetch mod list: ${message}` })
      throw err
    }

    const localMods = await this.getLocalMods()
    const remoteFileNames = new Set(remoteMods.map((m) => m.fileName))

    // Remove mods that are no longer in the remote repo
    for (const localMod of localMods) {
      if (!remoteFileNames.has(localMod)) {
        const filePath = path.join(this.modsDir, localMod)
        try {
          fs.unlinkSync(filePath)
        } catch {
          // Ignore removal errors
        }
      }
    }

    // Download missing or updated mods
    const modsToDownload: ModInfo[] = []
    for (const mod of remoteMods) {
      const localPath = path.join(this.modsDir, mod.fileName)
      if (!fs.existsSync(localPath)) {
        modsToDownload.push(mod)
      }
    }

    if (modsToDownload.length > 0) {
      this.updateStatus({ state: 'downloading', progress: 0, total: modsToDownload.length })

      for (let i = 0; i < modsToDownload.length; i++) {
        const mod = modsToDownload[i]
        this.updateStatus({
          progress: i,
          currentFile: mod.fileName,
        })

        const destPath = path.join(this.modsDir, mod.fileName)
        const tmpPath = destPath + '.tmp'

        try {
          await downloadFile(mod.downloadUrl, tmpPath)
          fs.renameSync(tmpPath, destPath)
          // Make the mod file read-only to prevent modification
          fs.chmodSync(destPath, 0o444)
        } catch (err) {
          if (fs.existsSync(tmpPath)) {
            fs.unlinkSync(tmpPath)
          }
          const message = err instanceof Error ? err.message : String(err)
          this.updateStatus({
            state: 'error',
            error: `Failed to download ${mod.fileName}: ${message}`,
          })
          throw err
        }
      }
    }

    this.updateStatus({ state: 'complete', progress: remoteMods.length, total: remoteMods.length })
    return remoteMods
  }

  getModsDirectory(): string {
    return this.modsDir
  }

  async verifyMods(remoteMods: ModInfo[]): Promise<boolean> {
    for (const mod of remoteMods) {
      const localPath = path.join(this.modsDir, mod.fileName)
      if (!fs.existsSync(localPath)) return false
    }
    return true
  }
}
