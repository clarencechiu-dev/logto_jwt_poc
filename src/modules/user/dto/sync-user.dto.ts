import { IsString, IsNotEmpty, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class SyncUserDto {
  @ApiProperty({ description: '外部系統 user ID（hermes userId）', example: 'hermes-user-123' })
  @IsString()
  @IsNotEmpty()
  externalId: string

  @ApiPropertyOptional({ description: '手機號碼', example: '0912345678' })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional({ description: 'Email', example: 'user@example.com' })
  @IsOptional()
  @IsString()
  email?: string
}
