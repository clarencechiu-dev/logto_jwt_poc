import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { OrganizationService } from './organization.service'
import { CreateOrganizationDto } from './dto/create-org.dto'
import { AddMemberDto } from './dto/add-member.dto'

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Get()
  @ApiOperation({
    summary: '取得所有組織',
    description: '列出 Logto 租戶中的所有組織（多租戶架構）。'
  })
  getOrganizations() {
    return this.orgService.getOrganizations()
  }

  @Get('roles')
  @ApiOperation({
    summary: '取得組織範本角色列表（Organization Template）',
    description:
      '列出 Organization Template 中定義的所有角色（如 Admin、Member、Viewer）。\n' +
      '參考文件：https://docs.logto.io/zh-TW/authorization/organization-template'
  })
  getOrganizationRoles() {
    return this.orgService.getOrganizationRoles()
  }

  @Post()
  @ApiOperation({
    summary: '建立組織',
    description: '在 Logto 中建立新組織。組織自動繼承 Organization Template 定義的角色與權限。'
  })
  @ApiResponse({ status: 200, description: '組織建立成功' })
  createOrganization(@Body() dto: CreateOrganizationDto) {
    return this.orgService.createOrganization(dto)
  }

  @Get(':orgId')
  @ApiOperation({ summary: '取得單一組織' })
  getOrganizationById(@Param('orgId') orgId: string) {
    return this.orgService.getOrganizationById(orgId)
  }

  @Delete(':orgId')
  @ApiOperation({ summary: '刪除組織' })
  deleteOrganization(@Param('orgId') orgId: string) {
    return this.orgService.deleteOrganization(orgId)
  }

  @Get(':orgId/members')
  @ApiOperation({
    summary: '取得組織成員列表',
    description: '列出組織中的所有使用者成員及其角色。'
  })
  getMembers(@Param('orgId') orgId: string) {
    return this.orgService.getMembers(orgId)
  }

  @Post(':orgId/members')
  @ApiOperation({
    summary: '新增成員到組織',
    description:
      '將 Logto 使用者加入組織，並可選擇指派組織角色。\n' +
      '組織角色決定成員在組織內的權限（對應 Organization Template）。'
  })
  @ApiResponse({ status: 200, description: '成員新增成功' })
  addMember(@Param('orgId') orgId: string, @Body() dto: AddMemberDto) {
    return this.orgService.addMember(orgId, dto)
  }

  @Delete(':orgId/members/:userId')
  @ApiOperation({ summary: '從組織移除成員' })
  removeMember(@Param('orgId') orgId: string, @Param('userId') userId: string) {
    return this.orgService.removeMember(orgId, userId)
  }
}
