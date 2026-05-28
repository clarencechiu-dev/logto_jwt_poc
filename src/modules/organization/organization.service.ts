import { Injectable } from '@nestjs/common'
import { LogtoService } from '../../logto/logto.service'
import { CreateOrganizationDto } from './dto/create-org.dto'
import { AddMemberDto } from './dto/add-member.dto'

@Injectable()
export class OrganizationService {
  constructor(private readonly logto: LogtoService) {}

  async getOrganizations() {
    return this.logto.getOrganizations()
  }

  async getOrganizationById(orgId: string) {
    return this.logto.getOrganizationById(orgId)
  }

  async createOrganization(dto: CreateOrganizationDto) {
    return this.logto.createOrganization(dto.name, dto.description)
  }

  async deleteOrganization(orgId: string) {
    await this.logto.deleteOrganization(orgId)
    return { deleted: true }
  }

  async getMembers(orgId: string) {
    return this.logto.getOrganizationMembers(orgId)
  }

  async addMember(orgId: string, dto: AddMemberDto) {
    await this.logto.addOrganizationMember(orgId, dto.userId)

    if (dto.organizationRoleIds?.length) {
      await this.logto.assignOrganizationRoles(orgId, dto.userId, dto.organizationRoleIds)
    }

    return { added: true }
  }

  async removeMember(orgId: string, userId: string) {
    await this.logto.removeOrganizationMember(orgId, userId)
    return { removed: true }
  }

  async getOrganizationRoles() {
    return this.logto.getOrganizationRoles()
  }
}
