import { IsString, IsNotEmpty, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({ description: '身分證 / 居留證號碼 / 護照號碼', example: 'A123456789' })
  @IsString()
  @IsNotEmpty()
  idCard: string

  @ApiProperty({ description: '手機裝置號碼', example: 'device-uuid-001' })
  @IsString()
  @IsNotEmpty()
  deviceId: string

  @ApiPropertyOptional({ description: 'FCM Token', example: 'fcm-token-xxx' })
  @IsOptional()
  @IsString()
  fcmToken?: string
}
