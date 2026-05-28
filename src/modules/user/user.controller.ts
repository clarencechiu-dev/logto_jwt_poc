import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { SyncUserDto } from './dto/sync-user.dto'
import { UserService } from './user.service'

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: '查詢使用者列表（Logto Management API）' })
  @ApiQuery({ name: 'search', required: false, description: '搜尋關鍵字' })
  getUsers(@Query('search') search?: string) {
    return this.userService.getUsers(search)
  }

  @Get(':id')
  @ApiOperation({ summary: '查詢單一使用者' })
  getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id)
  }

  @Post('sync')
  @ApiOperation({
    summary: '同步使用者到 Logto（對應 hermes-api syncLogtoUser）',
    description:
      '以 externalId 查詢或建立 Logto 使用者。\n' +
      '若已存在則回傳現有 user，否則建立新使用者。\n' +
      'Logto username 格式為 hermes_<externalId>。'
  })
  @ApiResponse({ status: 200, description: '同步成功' })
  syncUser(@Body() dto: SyncUserDto) {
    return this.userService.syncUser(dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: '刪除使用者' })
  deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id)
  }

  @Get(':id/organizations')
  @ApiOperation({ summary: '取得使用者所屬的所有組織' })
  getUserOrganizations(@Param('id') id: string) {
    return this.userService.getUserOrganizations(id)
  }
}
