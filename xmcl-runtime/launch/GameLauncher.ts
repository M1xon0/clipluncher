import { LaunchOptions, LaunchState } from '../../../xmcl-runtime-api/types/launcher'
import { UserProfile } from '../../../xmcl-runtime-api/types/user'
import * as child_process from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

const DEFAULT_MAX_MEMORY = 4096
const DEFAULT_MIN_MEMORY = 1024
const MINECRAFT_VERSION = '1.21.1'

interface LaunchArgs {
  javaPath: string
  gameDir: string
  neoforgeVersion: string
  userProfile: UserProfile
  maxMemory: number
  minMemory: number
  versionsDir: string
  librariesDir: string
  assetsDir: string
}

export class GameLauncher {
  private state: LaunchState = { status: 'idle' }
  private stateListeners: Array<(state: LaunchState) => void> = []
  private gameProcess: child_process.ChildProcess | null = null

  onStateChange(listener: (state: LaunchState) => void): () => void {
    this.stateListeners.push(listener)
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== listener)
    }
  }

  private updateState(state: Partial<LaunchState>): void {
    this.state = { ...this.state, ...state }
    this.stateListeners.forEach((l) => l(this.state))
  }

  getState(): LaunchState {
    return { ...this.state }
  }

  isRunning(): boolean {
    return this.state.status === 'running' || this.state.status === 'launching'
  }

  async launch(options: LaunchOptions, userProfile: UserProfile): Promise<void> {
    if (this.isRunning()) {
      throw new Error('Game is already running')
    }

    this.updateState({ status: 'preparing', error: undefined })

    const javaPath = options.javaPath || (await this.findJava())
    if (!javaPath) {
      const err = 'Java not found. Please install Java 21 or later.'
      this.updateState({ status: 'error', error: err })
      throw new Error(err)
    }

    const gameDir = options.gameDir
    const versionsDir = path.join(gameDir, 'versions')
    const librariesDir = path.join(gameDir, 'libraries')
    const assetsDir = path.join(gameDir, 'assets')

    const neoforgeVersion = options.modLoaderVersion || '21.1.172'
    const versionId = `neoforge-${neoforgeVersion}`
    const versionJson = path.join(versionsDir, versionId, `${versionId}.json`)

    if (!fs.existsSync(versionJson)) {
      const err = `NeoForge ${neoforgeVersion} is not installed. Please run the installer first.`
      this.updateState({ status: 'error', error: err })
      throw new Error(err)
    }

    this.updateState({ status: 'launching' })

    const args = this.buildLaunchArgs({
      javaPath,
      gameDir,
      neoforgeVersion,
      userProfile,
      maxMemory: options.maxMemory || DEFAULT_MAX_MEMORY,
      minMemory: options.minMemory || DEFAULT_MIN_MEMORY,
      versionsDir,
      librariesDir,
      assetsDir,
    })

    try {
      this.gameProcess = child_process.spawn(javaPath, args, {
        cwd: gameDir,
        env: { ...process.env },
        detached: false,
      })

      const pid = this.gameProcess.pid
      this.updateState({ status: 'running', pid, startTime: Date.now() })

      this.gameProcess.on('exit', (code) => {
        this.gameProcess = null
        if (code === 0 || code === null) {
          this.updateState({ status: 'stopped', pid: undefined })
        } else {
          this.updateState({
            status: 'error',
            pid: undefined,
            error: `Game exited with code ${code}`,
          })
        }
      })

      this.gameProcess.on('error', (err) => {
        this.gameProcess = null
        this.updateState({ status: 'error', pid: undefined, error: err.message })
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.updateState({ status: 'error', error: message })
      throw err
    }
  }

  stopGame(): void {
    if (this.gameProcess && !this.gameProcess.killed) {
      this.gameProcess.kill('SIGTERM')
    }
  }

  private buildLaunchArgs(args: LaunchArgs): string[] {
    const {
      gameDir,
      neoforgeVersion,
      userProfile,
      maxMemory,
      minMemory,
      versionsDir,
      librariesDir,
      assetsDir,
    } = args

    const versionId = `neoforge-${neoforgeVersion}`
    const nativesDir = path.join(versionsDir, versionId, 'natives')
    const classpathSeparator = process.platform === 'win32' ? ';' : ':'

    // Build classpath from libraries
    const classpath = this.buildClasspath(librariesDir, versionsDir, versionId, classpathSeparator)

    return [
      `-Xmx${maxMemory}M`,
      `-Xms${minMemory}M`,
      `-Djava.library.path=${nativesDir}`,
      `-Dminecraft.launcher.brand=ClipSMP`,
      `-Dminecraft.launcher.version=1.0.0`,
      `-cp`,
      classpath,
      'net.minecraft.client.main.Main',
      '--username',
      userProfile.username,
      '--version',
      MINECRAFT_VERSION,
      '--gameDir',
      gameDir,
      '--assetsDir',
      assetsDir,
      '--assetIndex',
      '1.21',
      '--uuid',
      userProfile.uuid,
      '--accessToken',
      userProfile.accessToken,
      '--userType',
      userProfile.type === 'offline' ? 'legacy' : 'msa',
      '--versionType',
      'release',
    ]
  }

  private buildClasspath(
    librariesDir: string,
    versionsDir: string,
    versionId: string,
    separator: string,
  ): string {
    const paths: string[] = []

    const libsDir = librariesDir
    if (fs.existsSync(libsDir)) {
      const findJars = (dir: string) => {
        if (!fs.existsSync(dir)) return
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            findJars(fullPath)
          } else if (entry.name.endsWith('.jar')) {
            paths.push(fullPath)
          }
        }
      }
      findJars(libsDir)
    }

    // Add the main version jar
    const versionJar = path.join(versionsDir, versionId, `${versionId}.jar`)
    if (fs.existsSync(versionJar)) {
      paths.push(versionJar)
    }

    return paths.join(separator)
  }

  private async findJava(): Promise<string | null> {
    // Common Java locations
    const locations: string[] = []

    if (process.platform === 'win32') {
      locations.push(
        'C:\\Program Files\\Java\\jdk-21\\bin\\java.exe',
        'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.0.0-hotspot\\bin\\java.exe',
        path.join(os.homedir(), '.jdks', 'openjdk-21', 'bin', 'java.exe'),
      )
    } else if (process.platform === 'darwin') {
      locations.push(
        '/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home/bin/java',
        '/opt/homebrew/opt/openjdk@21/bin/java',
        '/usr/local/opt/openjdk@21/bin/java',
      )
    } else {
      locations.push(
        '/usr/lib/jvm/java-21-openjdk-amd64/bin/java',
        '/usr/lib/jvm/java-21/bin/java',
        '/usr/bin/java',
      )
    }

    for (const loc of locations) {
      if (fs.existsSync(loc)) {
        return loc
      }
    }

    // Try PATH
    try {
      const whichCmd = process.platform === 'win32' ? 'where java' : 'which java'
      const result = child_process.execSync(whichCmd, { encoding: 'utf-8' }).trim().split('\n')[0]
      if (result && fs.existsSync(result)) {
        return result
      }
    } catch {
      // Not in PATH
    }

    return null
  }
}
