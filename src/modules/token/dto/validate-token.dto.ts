import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ValidateTokenDto {
  @ApiProperty({ description: 'Logto JWT access token', example: 'eyJ...' })
  @IsString()
  @IsNotEmpty()
  token: string

  @ApiPropertyOptional({
    description: '要驗證的 audience（API resource indicator）',
    example: 'https://api.your-app.com'
  })
  @IsOptional()
  @IsString()
  audience?: string

  @ApiPropertyOptional({
    description: '必須具備的 scopes（任一不符即失敗）',
    example: ['read:products'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredScopes?: string[]
}
