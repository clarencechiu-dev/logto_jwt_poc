import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { Transform } from 'class-transformer'

export class SendOtpDto {
  @ApiProperty({ description: '手機號碼（支援 09xx 或 +886xxx 格式）', example: '0912345678' })
  @IsString()
  @IsNotEmpty()
  phone: string

  @ApiProperty({ description: 'Sentry Token（Session 識別用）', example: 'my-session-token' })
  @IsString()
  @IsNotEmpty()
  sentryToken: string

  @ApiPropertyOptional({ description: 'API Resource indicator（預設使用 LOGTO_API_RESOURCE 環境變數）', example: 'https://api.your-app.com' })
  @IsOptional()
  @IsString()
  resource?: string

  @ApiPropertyOptional({
    description: '需要的 scope 清單（⚠️ 必須在此步驟宣告，exchange 才能拿到對應 scope 的 token）',
    example: ['write:application', 'read:application'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? [value] : undefined))
  scope?: string[]
}
