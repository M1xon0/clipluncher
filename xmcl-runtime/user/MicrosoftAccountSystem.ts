import { UserProfile } from '../../../xmcl-runtime-api/types/user'
import * as https from 'https'
import * as http from 'http'
import * as crypto from 'crypto'
import * as net from 'net'

// Set CLIPSMP_AZURE_CLIENT_ID environment variable or update this value with your Azure App registration client ID
const MICROSOFT_CLIENT_ID = process.env.CLIPSMP_AZURE_CLIENT_ID || 'your-azure-app-client-id'
const MICROSOFT_SCOPE = 'XboxLive.signin offline_access'
const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize'
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token'
const XBOX_AUTH_URL = 'https://user.auth.xboxlive.com/user/authenticate'
const XSTS_AUTH_URL = 'https://xsts.auth.xboxlive.com/xsts/authorize'
const MINECRAFT_AUTH_URL = 'https://api.minecraftservices.com/authentication/login_with_xbox'
const MINECRAFT_PROFILE_URL = 'https://api.minecraftservices.com/minecraft/profile'

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}

interface XboxResponse {
  Token: string
  DisplayClaims: {
    xui: Array<{ uhs: string }>
  }
}

interface MinecraftAuthResponse {
  access_token: string
  expires_in: number
}

interface MinecraftProfile {
  id: string
  name: string
  skins: Array<{ url: string; variant: string }>
  capes: Array<{ url: string }>
}

function httpsPost(url: string, body: unknown, isFormData = false): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const data = isFormData
      ? Object.entries(body as Record<string, string>)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join('&')
      : JSON.stringify(body)

    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': isFormData ? 'application/x-www-form-urlencoded' : 'application/json',
        'Content-Length': Buffer.byteLength(data),
        Accept: 'application/json',
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
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`))
        }
      })
    })

    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

function httpsGet(url: string, bearerToken: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        Accept: 'application/json',
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (c) => {
        data += c
      })
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data))
          } catch {
            resolve(data)
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address && typeof address === 'object') {
        const port = address.port
        server.close(() => resolve(port))
      } else {
        reject(new Error('Could not get port'))
      }
    })
    server.on('error', reject)
  })
}

export class MicrosoftAccountSystem {
  private storedRefreshTokens: Map<string, string> = new Map()

  async login(): Promise<UserProfile> {
    const port = await getFreePort()
    const redirectUri = `http://localhost:${port}/callback`
    const state = crypto.randomBytes(16).toString('hex')

    const authUrl =
      `${MICROSOFT_AUTH_URL}?` +
      `client_id=${MICROSOFT_CLIENT_ID}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(MICROSOFT_SCOPE)}` +
      `&state=${state}`

    const code = await this.waitForOAuthCallback(port, state, authUrl)
    const tokens = await this.exchangeCode(code, redirectUri)

    return this.authWithTokens(tokens)
  }

  async refresh(user: UserProfile): Promise<UserProfile | null> {
    const refreshToken = this.storedRefreshTokens.get(user.id)
    if (!refreshToken) return null

    try {
      const tokens = await this.refreshAccessToken(refreshToken)
      return this.authWithTokens(tokens, user.id)
    } catch {
      return null
    }
  }

  private async waitForOAuthCallback(
    port: number,
    expectedState: string,
    authUrl: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        const url = new URL(req.url || '/', `http://localhost:${port}`)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')

        if (state !== expectedState) {
          res.writeHead(400)
          res.end('Invalid state parameter')
          reject(new Error('Invalid OAuth state'))
          return
        }

        if (!code) {
          res.writeHead(400)
          res.end('No authorization code received')
          reject(new Error('No authorization code'))
          return
        }

        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(
          '<html><body><h1>Login successful! You can close this window.</h1></body></html>',
        )

        server.close()
        resolve(code)
      })

      server.listen(port, '127.0.0.1')
      server.on('error', reject)

      // Open browser - platform dependent
      const openBrowser = (url: string) => {
        const { exec } = require('child_process')
        const platform = process.platform
        if (platform === 'darwin') {
          exec(`open "${url}"`)
        } else if (platform === 'win32') {
          exec(`start "${url}"`)
        } else {
          exec(`xdg-open "${url}"`)
        }
      }

      openBrowser(authUrl)

      // Timeout after 5 minutes
      setTimeout(
        () => {
          server.close()
          reject(new Error('OAuth login timed out'))
        },
        5 * 60 * 1000,
      )
    })
  }

  private async exchangeCode(code: string, redirectUri: string): Promise<TokenResponse> {
    return (await httpsPost(
      MICROSOFT_TOKEN_URL,
      {
        client_id: MICROSOFT_CLIENT_ID,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      },
      true,
    )) as TokenResponse
  }

  private async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    return (await httpsPost(
      MICROSOFT_TOKEN_URL,
      {
        client_id: MICROSOFT_CLIENT_ID,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      },
      true,
    )) as TokenResponse
  }

  private async authWithTokens(tokens: TokenResponse, existingId?: string): Promise<UserProfile> {
    // Xbox Live authentication
    const xboxResponse = (await httpsPost(XBOX_AUTH_URL, {
      Properties: {
        AuthMethod: 'RPS',
        SiteName: 'user.auth.xboxlive.com',
        RpsTicket: `d=${tokens.access_token}`,
      },
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType: 'JWT',
    })) as XboxResponse

    const userHash = xboxResponse.DisplayClaims.xui[0].uhs

    // XSTS token
    const xstsResponse = (await httpsPost(XSTS_AUTH_URL, {
      Properties: {
        SandboxId: 'RETAIL',
        UserTokens: [xboxResponse.Token],
      },
      RelyingParty: 'rp://api.minecraftservices.com/',
      TokenType: 'JWT',
    })) as XboxResponse

    // Minecraft token
    const mcResponse = (await httpsPost(MINECRAFT_AUTH_URL, {
      identityToken: `XBL3.0 x=${userHash};${xstsResponse.Token}`,
    })) as MinecraftAuthResponse

    // Minecraft profile
    const profile = (await httpsGet(MINECRAFT_PROFILE_URL, mcResponse.access_token)) as MinecraftProfile

    const userId = existingId || profile.id

    if (tokens.refresh_token) {
      this.storedRefreshTokens.set(userId, tokens.refresh_token)
    }

    return {
      id: userId,
      username: profile.name,
      uuid: profile.id,
      accessToken: mcResponse.access_token,
      clientToken: crypto.randomUUID(),
      type: 'microsoft' as const,
      profileTextures: {
        skin: profile.skins?.[0]
          ? {
              url: profile.skins[0].url,
              metadata:
                profile.skins[0].variant === 'SLIM'
                  ? { model: 'slim' as const }
                  : { model: 'classic' as const },
            }
          : undefined,
        cape: profile.capes?.[0] ? { url: profile.capes[0].url } : undefined,
      },
      expiresAt: Date.now() + mcResponse.expires_in * 1000,
    }
  }
}
