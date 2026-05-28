import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { LogtoService } from '../../logto/logto.service'
import { ExchangeTokenDto } from './dto/exchange-token.dto'
import { LoginDto } from './dto/login.dto'
import { RefreshTokenDto } from './dto/refresh-token.dto'
import { SendOtpDto } from './dto/send-otp.dto'
import { VerifyOtpDto } from './dto/verify-otp.dto'
import { SessionStore } from './store/session.store'

const TOKEN_TTL_SEC = 35 * 60 // 35 分鐘，對應 hermes-api TOKEN_DEFAULT_TTL

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly logto: LogtoService,
    private readonly sessions: SessionStore
  ) {}

  /**
   * Step 0: 簽發 sentryToken 並存入 SessionStore
   * 對應 hermes-api postLogin → login() → _genSentryToken → SentryTokenStore.store()
   *
   * POC 簡化：不查 DB，authFlow 固定為 'login'
   */
  login(dto: LoginDto, userAgent: string) {
    const sentryToken = this.genSentryToken({
      idCard: dto.idCard,
      deviceId: dto.deviceId,
      userAgent
    })

    const expiredAt = new Date(Date.now() + TOKEN_TTL_SEC * 1000)

    this.sessions.set(sentryToken, {
      sentryToken,
      authFlow: 'login',
      idCard: dto.idCard.trim().toUpperCase(),
      deviceId: dto.deviceId,
      fcmToken: dto.fcmToken ?? '',
      userAgent,
      createdAt: Date.now()
    })

    return {
      wemoSentryToken: sentryToken,
      authFlow: 'login',
      expiredAt
    }
  }

  /**
   * Step 1: 發送 Phone OTP
   * 對應 hermes-api sendAuthSmsForSentry → initiatePhoneOtpForExperienceFlow
   */
  async sendOtp(dto: SendOtpDto): Promise<{ verificationId: string; maskedPhone: string }> {
    const session = this.sessions.get(dto.sentryToken)
    if (!session) {
      throw new NotFoundException('sentryToken not found or expired')
    }

    const { verificationId, session: otpSession } = await this.logto.initiatePhoneOtp(dto.phone, {
      resource: dto.resource,
      scopes: dto.scope
    })

    this.sessions.patch(dto.sentryToken, {
      phone: dto.phone,
      verificationId,
      sessionCookie: otpSession.sessionCookie,
      codeVerifier: otpSession.codeVerifier,
      state: otpSession.state,
      resource: otpSession.resource,
      scopes: otpSession.scopes
    })

    return { verificationId, maskedPhone: this.maskPhone(dto.phone) }
  }

  /**
   * Step 2: 驗證 Phone OTP
   * 對應 hermes-api verifyAuthSmsForSentry → verifyPhoneOtpForExperienceFlow
   */
  async verifyOtp(dto: VerifyOtpDto): Promise<{ verified: boolean }> {
    const session = this.sessions.get(dto.sentryToken)
    if (!session) {
      throw new NotFoundException('sentryToken not found or expired')
    }
    if (!session.phone || !session.sessionCookie || !session.codeVerifier) {
      throw new BadRequestException('OTP not initiated — call send-otp first')
    }
    if (!session.verificationId) {
      throw new BadRequestException('verificationId not found — call send-otp first')
    }

    await this.logto.verifyPhoneOtp(session.phone, dto.code, session.verificationId, {
      sessionCookie: session.sessionCookie,
      codeVerifier: session.codeVerifier,
      state: session.state ?? ''
    })

    this.sessions.patch(dto.sentryToken, { phoneVerifiedAt: Date.now() })

    return { verified: true }
  }

  /**
   * Step 3: 換取 Logto JWT access token + refresh token
   * 對應 hermes-api exchange → submitExperienceAndIssueToken
   */
  async exchangeToken(dto: ExchangeTokenDto) {
    const session = this.sessions.get(dto.sentryToken)
    if (!session) {
      throw new NotFoundException('sentryToken not found or expired')
    }
    if (!session.phoneVerifiedAt) {
      throw new BadRequestException('Phone OTP not verified — call verify-otp first')
    }
    if (!session.sessionCookie || !session.codeVerifier) {
      throw new BadRequestException('OTP session missing — call send-otp first')
    }

    const tokens = await this.logto.submitExperienceAndIssueToken(
      {
        sessionCookie: session.sessionCookie,
        codeVerifier: session.codeVerifier,
        state: session.state ?? ''
      },
      { organizationId: dto.organizationId, scopes: dto.scope, resource: dto.resource }
    )

    this.sessions.delete(dto.sentryToken)

    return tokens
  }

  /**
   * Refresh token（支援 org-scoped token）
   */
  async refreshToken(dto: RefreshTokenDto) {
    return this.logto.refreshToken({
      refreshToken: dto.refreshToken,
      organizationId: dto.organizationId,
      resource: dto.resource,
      scopes: dto.scope
    })
  }

  /**
   * 對應 hermes-api _genSentryToken
   * SHA256(uuid + SHA256(idCard::deviceId::userAgent))
   */
  private genSentryToken(payload: { idCard: string; deviceId: string; userAgent: string }): string {
    // const { idCard, deviceId, userAgent } = payload
    // const baseHash = createHash('sha256').update(`${idCard}::${deviceId}::${userAgent}`, 'utf8').digest('base64')
    // return createHash('sha256').update(`${randomUUID()}::${baseHash}`, 'utf8').digest('base64')
    return 'gWbl+ZE4NxLZyIf/oVT+RBgFpkP3Vpd6z7SvpUoaElA='
  }

  private maskPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length <= 4) return '****'
    return `${cleaned.slice(0, 3)}${'*'.repeat(cleaned.length - 5)}${cleaned.slice(-2)}`
  }
}
