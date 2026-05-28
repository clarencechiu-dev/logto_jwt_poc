import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator'
import { Transform } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class RefreshTokenDto {
  @ApiProperty({ description: 'Logto refresh token', example: 'rt_xxx' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string

  @ApiPropertyOptional({ description: '組織 ID（取得 org-scoped access token 時帶入）', example: 'org_abc123' })
  @IsOptional()
  @IsString()
  organizationId?: string

  @ApiPropertyOptional({ description: '要請求的 API resource indicator', example: 'https://api.your-app.com' })
  @IsOptional()
  @IsString()
  resource?: string

  @ApiPropertyOptional({ description: '要請求的 scopes', example: ['read:products', 'write:products'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? [value] : undefined))
  scope?: string[]
}
