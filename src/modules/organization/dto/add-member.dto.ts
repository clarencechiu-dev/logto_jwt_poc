import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class AddMemberDto {
  @ApiProperty({ description: 'Logto User ID', example: 'usr_abc123' })
  @IsString()
  @IsNotEmpty()
  userId: string

  @ApiPropertyOptional({
    description: '要指派的組織角色 IDs（organization template 中定義的角色）',
    example: ['role_admin', 'role_member'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  organizationRoleIds?: string[]
}
