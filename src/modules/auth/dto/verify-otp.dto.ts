import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class VerifyOtpDto {
  @ApiProperty({ description: 'Sentry Token（Session 識別用）', example: 'my-session-token' })
  @IsString()
  @IsNotEmpty()
  sentryToken: string

  @ApiProperty({ description: '使用者收到的 OTP 驗證碼', example: '123456' })
  @IsString()
  @IsNotEmpty()
  code: string
}
