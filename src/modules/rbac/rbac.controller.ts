import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { RbacService } from './rbac.service'

@ApiTags('rbac')
@Controller('rbac')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('roles')
  @ApiOperation({
    summary: '取得全域角色列表',
    description:
      '列出 Logto 租戶中所有的全域角色（Global Roles）。\n' +
      '全域角色用於控制 API resource 的存取權限。\n' +
      '參考文件：https://docs.logto.io/zh-TW/authorization/role-based-access-control'
  })
  getRoles() {
    return this.rbacService.getRoles()
  }

  @Get('resources')
  @ApiOperation({
    summary: '取得 API Resources 列表',
    description:
      '列出 Logto 中所有已註冊的 API Resources（含 Management API）。\n' +
      '每個 resource 有唯一的 indicator URI 與一組 scopes（permissions）。\n' +
      '參考文件：https://docs.logto.io/zh-TW/authorization/global-api-resources'
  })
  getApiResources() {
    return this.rbacService.getApiResources()
  }

  @Get('organization-template')
  @ApiOperation({
    summary: '取得 Organization Template 角色',
    description:
      '列出 Organization Template 中定義的組織角色與權限。\n' +
      '所有組織都共用此範本，確保一致的 RBAC 模型。\n' +
      '參考文件：https://docs.logto.io/zh-TW/authorization/organization-template'
  })
  getOrganizationTemplate() {
    return this.rbacService.getOrganizationTemplate()
  }
}
