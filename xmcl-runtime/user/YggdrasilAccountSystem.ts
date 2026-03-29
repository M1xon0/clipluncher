import { UserProfile } from '../../../xmcl-runtime-api/types/user'
import * as https from 'https'
import * as crypto from 'crypto'

const MOJANG_AUTH_URL = 'https://authserver.mojang.com'
const SESSION_URL = 'https://sessionserver.mojang.com'

interface YggdrasilAuthResponse {
  accessToken: string
  clientToken: string
  selectedProfile: {
    id: string
    name: string
  }
  availableProfiles?: Array<{ id: string; name: string }>
}

function httpsPost(url: string, body: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }

    const req = https.request(options, (res) => {
      let responseData = ''
      res.on('data', (chunk) => {
        responseData += chunk
      })
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseData))
          } catch {
            resolve(responseData)
          }
        } else {
          try {
            reject(new Error(JSON.parse(responseData).errorMessage || `HTTP ${res.statusCode}`))
          } catch {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`))
          }
        }
      })
    })

    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

export class YggdrasilAccountSystem {
  async login(username: string, password: string): Promise<UserProfile> {
    const clientToken = crypto.randomUUID()

    const response = (await httpsPost(`${MOJANG_AUTH_URL}/authenticate`, {
      agent: { name: 'Minecraft', version: 1 },
      requestUser: true,
      credentials: { username, password },
      clientToken,
    })) as YggdrasilAuthResponse

    return this.buildProfile(response, clientToken)
  }

  async refresh(user: UserProfile): Promise<UserProfile | null> {
    try {
      const response = (await httpsPost(`${MOJANG_AUTH_URL}/refresh`, {
        accessToken: user.accessToken,
        clientToken: user.clientToken,
        requestUser: true,
      })) as YggdrasilAuthResponse

      return this.buildProfile(response, user.clientToken)
    } catch {
      return null
    }
  }

  async validate(user: UserProfile): Promise<boolean> {
    try {
      await httpsPost(`${MOJANG_AUTH_URL}/validate`, {
        accessToken: user.accessToken,
        clientToken: user.clientToken,
      })
      return true
    } catch {
      return false
    }
  }

  private buildProfile(response: YggdrasilAuthResponse, clientToken: string): UserProfile {
    const profile = response.selectedProfile || response.availableProfiles?.[0]
    if (!profile) {
      throw new Error('No Minecraft profile found for this account')
    }

    return {
      id: profile.id,
      username: profile.name,
      uuid: profile.id,
      accessToken: response.accessToken,
      clientToken,
      type: 'yggdrasil' as const,
    }
  }

  async getProfile(uuid: string): Promise<{ skin?: string; cape?: string } | null> {
    return new Promise((resolve) => {
      const req = https.get(`${SESSION_URL}/session/minecraft/profile/${uuid}`, (res) => {
        let data = ''
        res.on('data', (c) => {
          data += c
        })
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data)
            const textureProperty = parsed.properties?.find(
              (p: { name: string }) => p.name === 'textures',
            )
            if (textureProperty) {
              const textures = JSON.parse(Buffer.from(textureProperty.value, 'base64').toString())
              resolve({
                skin: textures.textures?.SKIN?.url,
                cape: textures.textures?.CAPE?.url,
              })
            } else {
              resolve(null)
            }
          } catch {
            resolve(null)
          }
        })
      })
      req.on('error', () => resolve(null))
    })
  }
}
