import { Injectable } from '@nestjs/common'
import { LogtoService } from '../../logto/logto.service'
import { SyncUserDto } from './dto/sync-user.dto'

@Injectable()
export class UserService {
  constructor(private readonly logto: LogtoService) {}

  async getUsers(search?: string) {
    return this.logto.getUsers(search)
  }

  async getUserById(id: string) {
    return this.logto.getUserById(id)
  }

  async syncUser(dto: SyncUserDto) {
    return this.logto.syncUser({
      externalId: dto.externalId,
      phone: dto.phone,
      email: dto.email
    })
  }

  async deleteUser(id: string) {
    await this.logto.deleteUser(id)
    return { deleted: true }
  }

  async getUserOrganizations(id: string) {
    return this.logto.getUserOrganizations(id)
  }
}
