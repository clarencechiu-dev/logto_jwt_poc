import { registerAs } from '@nestjs/config'

export default registerAs('logto', () => ({
  baseUrl: process.env.LOGTO_BASE_URL ?? '',
  issuer: process.env.LOGTO_ISSUER ?? '',
  tenantId: process.env.LOGTO_TENANT_ID ?? 'default',

  // M2M App（Management API 用）
  clientId: process.env.LOGTO_CLIENT_ID ?? '',
  clientSecret: process.env.LOGTO_CLIENT_SECRET ?? '',

  // Management API indicator
  apiIndicator: process.env.LOGTO_API_INDICATOR ?? 'https://default.logto.app/api',

  // Web App（Experience API flow 用）
  webClientId: process.env.LOGTO_WEB_CLIENT_ID ?? '',
  webClientSecret: process.env.LOGTO_WEB_CLIENT_SECRET ?? '',
  webRedirectUri: process.env.LOGTO_WEB_REDIRECT_URI ?? 'http://localhost:3000/callback',

  // 你的 API Resource indicator
  apiResource: process.env.LOGTO_API_RESOURCE ?? ''
}))
