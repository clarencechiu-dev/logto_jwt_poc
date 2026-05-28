import { IsArray, IsOptional, IsString, IsNotEmpty } from 'class-validator'
import { Transform } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ExchangeTokenDto {
  @ApiProperty({ description: 'Sentry Token（已完成 OTP 驗證）', example: 'my-session-token' })
  @IsString()
  @IsNotEmpty()
  sentryToken: string

  @ApiPropertyOptional({ description: '組織 ID（取得 org-scoped token 用）', example: 'org_abc123' })
  @IsOptional()
  @IsString()
  organizationId?: string

  @ApiPropertyOptional({ description: 'API resource indicator', example: 'http://localhost:3000/application/users' })
  @IsOptional()
  @IsString()
  resource?: string

  @ApiPropertyOptional({ description: '要請求的 scopes', example: ['write:application', 'read:application'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? [value] : undefined))
  scope?: string[]
}
