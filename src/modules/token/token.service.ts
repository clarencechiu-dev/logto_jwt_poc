import { Injectable, Logger } from '@nestjs/common'
import { LogtoService } from '../../logto/logto.service'
import { ValidateTokenDto } from './dto/validate-token.dto'

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name)
  constructor(private readonly logto: LogtoService) {}

  async validate(dto: ValidateTokenDto) {
    const payload = await this.logto.validateToken(dto.token, {
      audience: dto.audience,
      requiredScopes: dto.requiredScopes
    })

    this.logger.debug(`[validateToken] payload: ${JSON.stringify(payload)}`)

    const scopes = ((payload.scope as string) ?? '').split(' ').filter(Boolean)
    const audience = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : []

    return {
      valid: true,
      sub: payload.sub,
      clientId: payload.client_id,
      organizationId: payload.organization_id,
      scopes,
      audience,
      issuedAt: payload.iat,
      expiresAt: payload.exp,
      issuer: payload.iss,
      raw: payload
    }
  }

  /** 僅 decode（不驗簽），快速查看 token 內容 */
  decode(token: string) {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return { error: 'Not a valid JWT format' }
    }

    const decode = (str: string) => {
      try {
        return JSON.parse(Buffer.from(str, 'base64url').toString())
      } catch {
        return null
      }
    }

    return {
      header: decode(parts[0]),
      payload: decode(parts[1]),
      note: 'Signature NOT verified — for inspection only'
    }
  }
}
