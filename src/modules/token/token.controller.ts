import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ValidateTokenDto } from './dto/validate-token.dto'
import { TokenService } from './token.service'

@ApiTags('token')
@Controller('token')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Post('validate')
  @ApiOperation({
    summary: '驗證 Logto JWT Access Token',
    description:
      '使用 Logto JWKS 驗證 JWT 簽章，並檢查 iss、aud、exp、scope。\n' +
      '回傳解析後的 claims：sub、organizationId、scopes、audience 等。\n' +
      '參考 Logto 文件：https://docs.logto.io/zh-TW/authorization/validate-access-tokens'
  })
  @ApiResponse({ status: 200, description: 'Token 有效' })
  @ApiResponse({ status: 400, description: 'Token 無效或已過期' })
  async validate(@Body() dto: ValidateTokenDto) {
    return this.tokenService.validate(dto)
  }

  @Get('decode')
  @ApiOperation({
    summary: 'Decode JWT（不驗簽，僅查看 claims）',
    description: '快速 decode JWT header 與 payload，不驗證簽章。適合開發時查看 token 內容。'
  })
  @ApiQuery({ name: 'token', description: 'JWT token', example: 'eyJ...' })
  decode(@Query('token') token: string) {
    return this.tokenService.decode(token)
  }
}
