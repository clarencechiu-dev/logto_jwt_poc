/**
 * LogtoService
 *
 * 負責所有與 Logto 的底層 HTTP 互動：
 * 1. M2M token（Management API 用）
 * 2. Management API（User / Organization / RBAC CRUD）
 * 3. Experience API flow（Phone OTP → Authorization code → Tokens）
 * 4. JWT 驗證（JWKS）
 */

import { HttpException, HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'
import { createHash, randomBytes } from 'crypto'
import { createRemoteJWKSet, JWTPayload, jwtVerify } from 'jose'

export interface LogtoExperienceSession {
  sessionCookie: string
  codeVerifier: string
  state: string
  resource?: string
  scopes?: string[]
}

export interface LogtoOtpResult {
  verificationId: string
  session: LogtoExperienceSession
}

export interface LogtoUserToken {
  accessToken: string
  refreshToken: string
  idToken?: string
  expiresIn: number
}

@Injectable()
export class LogtoService implements OnModuleInit {
  private readonly logger = new Logger(LogtoService.name)

  private readonly baseUrl: string
  private readonly issuer: string
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly apiIndicator: string
  private readonly webClientId: string
  private readonly webClientSecret: string
  private readonly webRedirectUri: string
  private readonly apiResource: string

  // M2M token 快取
  private m2mToken: string | null = null
  private m2mTokenExpiry: number = 0

  // JWKS client（lazily created）
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null

  private readonly http: AxiosInstance

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('logto.baseUrl')!
    this.issuer = this.config.get<string>('logto.issuer')!
    this.clientId = this.config.get<string>('logto.clientId')!
    this.clientSecret = this.config.get<string>('logto.clientSecret')!
    this.apiIndicator = this.config.get<string>('logto.apiIndicator')!
    this.webClientId = this.config.get<string>('logto.webClientId')!
    this.webClientSecret = this.config.get<string>('logto.webClientSecret')!
    this.webRedirectUri = this.config.get<string>('logto.webRedirectUri')!
    this.apiResource = this.config.get<string>('logto.apiResource')!

    this.http = axios.create({ baseURL: this.baseUrl })
  }

  onModuleInit() {
    this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/jwks`))
  }

  /**
   * 將 Logto / axios 錯誤轉為有意義的 HttpException
   * Logto error shape: { code, message, data }
   */
  private handleAxiosError(err: unknown, fallback = 'Logto request failed'): never {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? HttpStatus.BAD_GATEWAY
      const data = err.response?.data as { code?: string; message?: string } | undefined
      const message = data?.message ?? data?.code ?? err.message ?? fallback
      this.logger.error(`Logto error [${status}]: ${message}`, JSON.stringify(data))
      throw new HttpException({ message, logtoCode: data?.code, detail: data }, status)
    }
    throw new HttpException(fallback, HttpStatus.INTERNAL_SERVER_ERROR)
  }

  // ---------------------------------------------------------------------------
  // M2M Token（Management API 授權）
  // ---------------------------------------------------------------------------

  private async getM2mToken(): Promise<string> {
    const now = Date.now() / 1000
    if (this.m2mToken && this.m2mTokenExpiry > now + 30) {
      return this.m2mToken
    }

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      resource: this.apiIndicator,
      scope: 'all'
    })

    try {
      const resp = await this.http.post<{ access_token: string; expires_in: number }>(
        '/oidc/token',
        params.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          auth: { username: this.clientId, password: this.clientSecret }
        }
      )

      this.m2mToken = resp.data.access_token
      this.m2mTokenExpiry = now + resp.data.expires_in
      return this.m2mToken
    } catch (err) {
      this.handleAxiosError(err, 'Failed to obtain M2M token')
    }
  }

  /** 帶 M2M bearer token 的 Management API 請求 */
  private async mgmt<T = unknown>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT',
    path: string,
    data?: unknown,
    params?: Record<string, string | number | undefined>
  ): Promise<T> {
    const token = await this.getM2mToken()
    try {
      const resp = await this.http.request<T>({
        method,
        url: `/api${path}`,
        data,
        params,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      return resp.data
    } catch (err) {
      this.handleAxiosError(err, `Management API ${method} ${path} failed`)
    }
  }

  // ---------------------------------------------------------------------------
  // User Management
  // ---------------------------------------------------------------------------

  async getUsers(search?: string): Promise<unknown[]> {
    const params: Record<string, string | undefined> = {}
    if (search) params['search'] = search
    return this.mgmt<unknown[]>('GET', '/users', undefined, params)
  }

  async getUserById(logtoUserId: string): Promise<unknown> {
    return this.mgmt('GET', `/users/${logtoUserId}`)
  }

  /**
   * 以 username = hermes_<externalId> 查詢或建立 Logto 使用者
   * 這是 hermes-api 的 syncLogtoUser 模式
   */
  async syncUser(opts: {
    externalId: string
    phone?: string
    email?: string
    customData?: Record<string, unknown>
  }): Promise<{ id: string; isNew: boolean }> {
    const username = `hermes_${opts.externalId}`

    // 先查詢
    const users = await this.mgmt<unknown[]>('GET', '/users', undefined, {
      'search.username': username,
      'mode.username': 'exact'
    })

    const existing = (users as any[]).find((u) => u.username === username)
    if (existing) {
      if (opts.customData) {
        await this.mgmt('PATCH', `/users/${existing.id}`, {
          customData: { ...existing.customData, ...opts.customData }
        })
      }
      return { id: existing.id as string, isNew: false }
    }

    // 建立新使用者
    const created = await this.mgmt<{ id: string }>('POST', '/users', {
      externalId: opts.externalId,
      username,
      primaryPhone: opts.phone,
      primaryEmail: opts.email,
      customData: opts.customData ?? {}
    })

    return { id: created.id, isNew: true }
  }

  async updateUser(logtoUserId: string, data: Record<string, unknown>): Promise<unknown> {
    return this.mgmt('PATCH', `/users/${logtoUserId}`, data)
  }

  async deleteUser(logtoUserId: string): Promise<void> {
    await this.mgmt('DELETE', `/users/${logtoUserId}`)
  }

  // ---------------------------------------------------------------------------
  // Organization Management
  // ---------------------------------------------------------------------------

  async getOrganizations(): Promise<unknown[]> {
    return this.mgmt<unknown[]>('GET', '/organizations')
  }

  async getOrganizationById(orgId: string): Promise<unknown> {
    return this.mgmt('GET', `/organizations/${orgId}`)
  }

  async createOrganization(name: string, description?: string): Promise<unknown> {
    return this.mgmt('POST', '/organizations', { name, description })
  }

  async deleteOrganization(orgId: string): Promise<void> {
    await this.mgmt('DELETE', `/organizations/${orgId}`)
  }

  async getOrganizationMembers(orgId: string): Promise<unknown[]> {
    return this.mgmt<unknown[]>('GET', `/organizations/${orgId}/users`)
  }

  async addOrganizationMember(orgId: string, userId: string): Promise<void> {
    await this.mgmt('POST', `/organizations/${orgId}/users`, {
      userIds: [userId]
    })
  }

  async removeOrganizationMember(orgId: string, userId: string): Promise<void> {
    await this.mgmt('DELETE', `/organizations/${orgId}/users/${userId}`)
  }

  async getOrganizationRoles(): Promise<unknown[]> {
    return this.mgmt<unknown[]>('GET', '/organization-roles')
  }

  async assignOrganizationRoles(orgId: string, userId: string, organizationRoleIds: string[]): Promise<void> {
    await this.mgmt('POST', `/organizations/${orgId}/users/${userId}/roles`, {
      organizationRoleIds
    })
  }

  async getUserOrganizations(logtoUserId: string): Promise<unknown[]> {
    return this.mgmt<unknown[]>('GET', `/users/${logtoUserId}/organizations`)
  }

  // ---------------------------------------------------------------------------
  // RBAC — Global Roles & API Resources
  // ---------------------------------------------------------------------------

  async getRoles(): Promise<unknown[]> {
    return this.mgmt<unknown[]>('GET', '/roles')
  }

  async getApiResources(): Promise<unknown[]> {
    return this.mgmt<unknown[]>('GET', '/resources')
  }

  async getOrganizationTemplate(): Promise<unknown> {
    return this.mgmt('GET', '/organization-roles')
  }

  // ---------------------------------------------------------------------------
  // Experience API Flow（Phone OTP → tokens）
  // 完整復刻 hermes-api initiatePhoneOtpForExperienceFlow / verifyPhoneOtpForExperienceFlow / submitExperienceAndIssueToken
  // ---------------------------------------------------------------------------

  private toLogtoPhone(phone: string): string {
    const trimmed = phone.trim().replace(/[\s\-()]/g, '')
    if (trimmed.startsWith('+')) return trimmed.slice(1)
    if (trimmed.startsWith('0')) return `886${trimmed.slice(1)}`
    return trimmed
  }

  private async generatePkce(): Promise<{ codeVerifier: string; codeChallenge: string }> {
    const codeVerifier = randomBytes(32).toString('base64url')
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
    return { codeVerifier, codeChallenge }
  }

  /**
   * Step 1: 初始化 OIDC session，發送 Phone OTP
   */
  async initiatePhoneOtp(phone: string, opts?: { resource?: string; scopes?: string[] }): Promise<LogtoOtpResult> {
    const logtoPhone = this.toLogtoPhone(phone)
    const { codeVerifier, codeChallenge } = await this.generatePkce()
    const stateVal = randomBytes(16).toString('hex')
    // const resource = opts?.resource ?? this.apiResource

    // 固定基本 scope，加上呼叫端傳入的額外 scope
    const baseScopes = [
      'openid',
      'offline_access',
      'urn:logto:scope:organizations',
      'urn:logto:scope:organization_roles',
      'urn:logto:scope:sessions'
    ]
    if (opts?.scopes?.length) {
      for (const s of opts.scopes) {
        if (!baseScopes.includes(s)) baseScopes.push(s)
      }
    }
    this.logger.debug(`[initiatePhoneOtp] auth URL scopes: ${baseScopes.join(' ')}`)

    const authUrl = new URL(`${this.baseUrl}/oidc/auth`)
    authUrl.searchParams.set('client_id', this.webClientId)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('redirect_uri', this.webRedirectUri)
    authUrl.searchParams.set('scope', baseScopes.join(' '))
    if (opts?.resource) {
      authUrl.searchParams.set('resource', opts.resource)
    }
    authUrl.searchParams.set('state', stateVal)
    authUrl.searchParams.set('code_challenge', codeChallenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')
    // prompt=login：強制使用者重新驗證，但不強制每次重新 consent
    // authUrl.searchParams.set('prompt', 'login')
    // （prompt=consent 會導致每次都重新跑 consent 流程，即使已同意過）
    // authUrl.searchParams.set('prompt', 'consent')

    this.logger.debug(`[initiatePhoneOtp] ---------- initiatePhoneOtp -----------------`)
    this.logger.debug(`[initiatePhoneOtp] authUrl: ${authUrl.toString()}`)

    // 取得 session cookie（不 follow redirect）
    const authResp = await this.http.get(authUrl.toString(), {
      maxRedirects: 0,
      validateStatus: () => true
    })

    if (authResp.status !== 302 && authResp.status !== 303) {
      throw new Error(
        `Logto /oidc/auth returned unexpected status ${authResp.status}: ${JSON.stringify(authResp.data)?.substring(0, 200)}`
      )
    }

    const setCookie = authResp.headers['set-cookie']
    if (!setCookie?.length) {
      throw new Error('Logto: No session cookie from /oidc/auth')
    }
    const sessionCookie = setCookie.map((c) => c.split(';')[0]).join('; ')

    const experienceHeaders = {
      'Content-Type': 'application/json',
      Cookie: sessionCookie
    }

    // 初始化 interaction
    await this.http.put('/api/experience', { interactionEvent: 'SignIn' }, { headers: experienceHeaders })

    // 發送 OTP
    const otpResp = await this.http.post<{ verificationId: string }>(
      '/api/experience/verification/verification-code',
      { identifier: { type: 'phone', value: logtoPhone }, interactionEvent: 'SignIn' },
      { headers: experienceHeaders }
    )

    return {
      verificationId: otpResp.data.verificationId,
      session: { sessionCookie, codeVerifier, state: stateVal, resource: opts?.resource, scopes: opts?.scopes }
    }
  }

  /**
   * Step 2: 驗證 OTP + identification
   */
  async verifyPhoneOtp(
    phone: string,
    code: string,
    verificationId: string,
    session: LogtoExperienceSession
  ): Promise<void> {
    const logtoPhone = this.toLogtoPhone(phone)
    const headers = {
      'Content-Type': 'application/json',
      Cookie: session.sessionCookie
    }

    try {
      await this.http.post(
        '/api/experience/verification/verification-code/verify',
        { identifier: { type: 'phone', value: logtoPhone }, code, verificationId },
        { headers }
      )

      await this.http.post('/api/experience/identification', { verificationId, linkSocialIdentity: false }, { headers })
    } catch (err) {
      this.handleAxiosError(err, 'OTP verification failed')
    }
  }

  /**
   * Step 3: submit experience → authorization code → access_token + refresh_token
   */
  async submitExperienceAndIssueToken(
    session: LogtoExperienceSession,
    opts?: { organizationId?: string; scopes?: string[]; resource?: string }
  ): Promise<LogtoUserToken> {
    const headers = {
      'Content-Type': 'application/json',
      Cookie: session.sessionCookie
    }

    // Submit interaction
    const submitResp = await this.http.post(
      '/api/experience/submit',
      {},
      {
        headers,
        maxRedirects: 0,
        validateStatus: () => true
      }
    )

    if (submitResp.status !== 200 && submitResp.status !== 302 && submitResp.status !== 303) {
      throw new Error(
        `Unexpected submit status ${submitResp.status}: ${JSON.stringify(submitResp.data)?.substring(0, 300)}`
      )
    }

    const redirectTo: string = submitResp.data?.redirectTo ?? submitResp.headers['location']
    if (!redirectTo) {
      throw new Error(`No redirectTo in submit response`)
    }

    let finalLocation = redirectTo
    const parsedRedirect = new URL(redirectTo, this.baseUrl)

    if (!parsedRedirect.searchParams.get('code')) {
      const followResp = await axios.get(new URL(redirectTo, this.baseUrl).toString(), {
        maxRedirects: 0,
        validateStatus: () => true,
        headers: { Cookie: session.sessionCookie }
      })

      const location = followResp.headers['location']
      if (!location) {
        throw new Error(`No Location after following intermediate URL`)
      }

      const parsedLocation = new URL(location, this.baseUrl)

      // 需要處理 consent 頁面
      if (parsedLocation.pathname.startsWith('/consent')) {
        const updatedCookieParts: string[] = followResp.headers['set-cookie']?.map((c) => c.split(';')[0]) ?? []
        const originalParts = session.sessionCookie.split('; ')
        const mergedMap = new Map<string, string>()
        for (const part of [...originalParts, ...updatedCookieParts]) {
          const name = part.split('=')[0]
          if (name) mergedMap.set(name, part)
        }
        const consentCookie = [...mergedMap.values()].join('; ')

        // GET consent info 了解 Logto 需要 consent 的項目
        const consentInfoResp = await axios.get(`${this.baseUrl}/api/interaction/consent`, {
          headers: { Cookie: consentCookie },
          validateStatus: () => true
        })
        const consentInfo = consentInfoResp.data ?? {}
        this.logger.debug(`[submitExperience] consentInfo: ${JSON.stringify(consentInfo)?.substring(0, 1000)}`)

        // 根據 consentInfo 動態建 consent body：
        // - organizationIds: 當 missingOIDCScope 有 urn:logto:scope:organizations 或明確指定 org
        // - resourceScopes: 每次都需聲明，否則 auth code grant 不包含 resource scopes（即使之前已 consent）
        const consentBody: {
          organizationIds?: string[]
          resourceScopes?: { resource: string; scopes: string[] }[]
        } = {}

        const needsOrgScope =
          Array.isArray(consentInfo.missingOIDCScope) &&
          consentInfo.missingOIDCScope.includes('urn:logto:scope:organizations')

        if (needsOrgScope) {
          const orgIds: string[] = opts?.organizationId
            ? [opts.organizationId]
            : (consentInfo.organizations ?? []).map((o: { id: string }) => o.id)
          if (orgIds.length) consentBody.organizationIds = orgIds
        } else if (opts?.organizationId) {
          consentBody.organizationIds = [opts.organizationId]
        }

        // Fix: Use the exact scope names from missingResourceScopes
        if (opts?.resource && opts?.scopes?.length) {
          consentBody.resourceScopes = [{ resource: opts.resource, scopes: opts.scopes }]
        } else if (consentInfo.missingResourceScopes?.length) {
          consentBody.resourceScopes = consentInfo.missingResourceScopes.map((mrs: any) => ({
            resource: mrs.resource.indicator,
            scopes: mrs.scopes.map((s: any) => s.name)
          }))
        }

        this.logger.debug(`[submitExperience] consentBody: ${JSON.stringify(consentBody)}`)

        const consentResp = await axios.post(`${this.baseUrl}/api/interaction/consent`, consentBody, {
          headers: { 'Content-Type': 'application/json', Cookie: consentCookie },
          validateStatus: () => true
        })

        this.logger.debug(
          `[submitExperience] consentResp status=${consentResp.status} data=${JSON.stringify(consentResp.data)?.substring(0, 500)}`
        )
        if (consentResp.status !== 200) {
          throw new Error(`Consent step failed: status=${consentResp.status}`)
        }

        finalLocation = consentResp.data?.redirectTo ?? ''
        if (!finalLocation) throw new Error('No redirectTo after consent')

        const parsedConsentRedirect = new URL(finalLocation, this.baseUrl)
        if (!parsedConsentRedirect.searchParams.get('code')) {
          const postConsentResp = await axios.get(new URL(finalLocation, this.baseUrl).toString(), {
            maxRedirects: 0,
            validateStatus: () => true,
            headers: { Cookie: consentCookie }
          })
          const postConsentLocation = postConsentResp.headers['location']
          if (!postConsentLocation) {
            throw new Error('No Location after following consent redirect')
          }
          finalLocation = postConsentLocation
        }
      } else {
        finalLocation = location
      }
    }

    const redirectUrl = new URL(finalLocation, this.baseUrl)
    const authorizationCode = redirectUrl.searchParams.get('code') ?? ''
    if (!authorizationCode) {
      throw new Error(`No code in final redirect URL: ${finalLocation.substring(0, 300)}`)
    }

    // Authorization code → tokens
    // 注意：Logto v1 不支援在 auth code exchange 帶 organization_id
    // org-scoped token 須透過 refresh 取得
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: authorizationCode,
      redirect_uri: this.webRedirectUri,
      client_id: this.webClientId,
      code_verifier: session.codeVerifier
    })
    this.logger.debug(`[submitExperience] opt: ${opts ? JSON.stringify(opts) : 'none'}`)

    // if (opts?.organizationId) {
    //   tokenParams.set('organization_id', opts.organizationId)
    // }
    if (opts?.resource) {
      tokenParams.set('resource', opts.resource)
    }
    if (opts?.scopes?.length) {
      tokenParams.set('scope', opts.scopes.join(' '))
    }
    // log 在所有 params 設定完後再印
    this.logger.debug(`[submitExperience] tokenParams: ${tokenParams.toString()}`)

    try {
      const tokenResp = await axios.post<{
        access_token: string
        refresh_token: string
        id_token?: string
        expires_in: number
        scope?: string
      }>(`${this.baseUrl}/oidc/token`, tokenParams.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        auth: { username: this.webClientId, password: this.webClientSecret }
      })

      // decode access token payload to see granted scopes
      const atPayload = JSON.parse(Buffer.from(tokenResp.data.access_token.split('.')[1], 'base64url').toString())
      this.logger.debug(
        `[submitExperience] exchanged AT scope="${atPayload.scope}" org="${atPayload.organization_id}" resource="${atPayload.aud}"`
      )

      return {
        accessToken: tokenResp.data.access_token,
        refreshToken: tokenResp.data.refresh_token,
        idToken: tokenResp.data.id_token,
        expiresIn: tokenResp.data.expires_in
      }
    } catch (err) {
      this.handleAxiosError(err, 'Authorization code exchange failed')
    }
  }

  /**
   * Refresh token → 新的 access_token（可帶 organization_id 取得 org-scoped token）
   */
  async refreshToken(opts: {
    refreshToken: string
    organizationId?: string
    resource?: string
    scopes?: string[]
  }): Promise<LogtoUserToken> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: opts.refreshToken
    })

    this.logger.debug(`[refreshToken] opts : ${JSON.stringify(opts)}`)

    if (opts.resource) {
      params.set('resource', opts.resource)
    }
    if (opts.organizationId) {
      params.set('organization_id', opts.organizationId)
    }
    if (opts.scopes?.length) {
      params.set('scope', opts.scopes.join(' '))
    }

    try {
      const resp = await axios.post<{
        access_token: string
        refresh_token: string
        id_token?: string
        expires_in: number
      }>(`${this.baseUrl}/oidc/token`, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        auth: { username: this.webClientId, password: this.webClientSecret }
      })

      return {
        accessToken: resp.data.access_token,
        refreshToken: resp.data.refresh_token,
        idToken: resp.data.id_token,
        expiresIn: resp.data.expires_in
      }
    } catch (err) {
      this.logger.error(`[refreshToken] error: ${err}`)
      this.handleAxiosError(err, 'Failed to refresh token')
    }
  }

  // ---------------------------------------------------------------------------
  // JWT Validation（JWKS）
  // ---------------------------------------------------------------------------

  async validateToken(token: string, opts?: { audience?: string; requiredScopes?: string[] }): Promise<JWTPayload> {
    if (!this.jwks) {
      this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/jwks`))
    }

    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.issuer,
      audience: opts?.audience
    })

    if (opts?.requiredScopes?.length) {
      const rawScope = (payload.scope as string) ?? ''
      const tokenScopes = rawScope ? rawScope.split(' ') : []
      const missing = opts.requiredScopes.filter((s) => !tokenScopes.includes(s))
      if (missing.length) {
        throw new HttpException(
          {
            message: `Missing required scopes: ${missing.join(', ')}`,
            tokenScopes,
            requiredScopes: opts.requiredScopes
          },
          HttpStatus.FORBIDDEN
        )
      }
    }

    return payload
  }
}
