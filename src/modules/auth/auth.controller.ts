import { Body, Controller, Headers, Post } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { ExchangeTokenDto } from './dto/exchange-token.dto'
import { LoginDto } from './dto/login.dto'
import { RefreshTokenDto } from './dto/refresh-token.dto'
import { SendOtpDto } from './dto/send-otp.dto'
import { VerifyOtpDto } from './dto/verify-otp.dto'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: '簽發 sentryToken（登入入口）',
    description:
      '使用 idCard + deviceId 取得 sentryToken，存入 SessionStore（TTL 35 分鐘）。\n' +
      '對應 hermes-api: postLogin → login() → _genSentryToken → SentryTokenStore.store()\n\n' +
      'POC 簡化：不查 DB，authFlow 固定回傳 login。\n' +
      '後續所有步驟（send-otp、verify-otp、exchange）都需帶此 sentryToken。'
  })
  @ApiResponse({ status: 201, description: '成功取得 sentryToken' })
  login(@Body() dto: LoginDto, @Headers('user-agent') userAgent: string) {
    return this.authService.login(dto, userAgent ?? 'Unknown')
  }

  @Post('send-otp')
  @ApiOperation({
    summary: '發送手機 OTP（Logto Experience API）',
    description:
      '需先呼叫 /auth/login 取得 sentryToken。\n' +
      '初始化 Logto OIDC session 並透過 Experience API 發送 SMS OTP。\n' +
      '對應 hermes-api: sendAuthSmsForSentry → initiatePhoneOtpForExperienceFlow'
  })
  @ApiResponse({ status: 201, description: '成功發送 OTP' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto)
  }

  @Post('verify-otp')
  @ApiOperation({
    summary: '驗證手機 OTP（Logto Experience API）',
    description:
      '驗證使用者輸入的 OTP 並完成 identification。\n' +
      '對應 hermes-api: verifyAuthSmsForSentry → verifyPhoneOtpForExperienceFlow'
  })
  @ApiResponse({ status: 201, description: 'OTP 驗證成功' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto)
  }

  @Post('exchange')
  @ApiOperation({
    summary: '換取 Logto JWT Access Token + Refresh Token',
    description:
      '完成 OIDC flow，取得 access_token 與 refresh_token。\n' +
      '需先完成 verify-otp。\n' +
      '對應 hermes-api: exchange → submitExperienceAndIssueToken'
  })
  @ApiResponse({ status: 201, description: 'Token 換取成功' })
  exchangeToken(@Body() dto: ExchangeTokenDto) {
    return this.authService.exchangeToken(dto)
  }

  @Post('refresh')
  @ApiOperation({
    summary: '刷新 Access Token（支援 org-scoped）',
    description:
      '使用 refresh_token 取得新的 access_token。\n' +
      '帶入 organizationId 可取得帶 organization_id claim 的 org-scoped token。'
  })
  @ApiResponse({ status: 201, description: 'Token 刷新成功' })
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto)
  }
}
