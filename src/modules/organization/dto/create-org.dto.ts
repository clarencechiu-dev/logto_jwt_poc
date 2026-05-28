import { IsString, IsNotEmpty, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateOrganizationDto {
  @ApiProperty({ description: '組織名稱', example: 'Acme Corp' })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiPropertyOptional({ description: '組織描述', example: 'A sample organization' })
  @IsOptional()
  @IsString()
  description?: string
}
