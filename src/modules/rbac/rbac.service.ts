import { Injectable } from '@nestjs/common'
import { LogtoService } from '../../logto/logto.service'

@Injectable()
export class RbacService {
  constructor(private readonly logto: LogtoService) {}

  async getRoles() {
    return this.logto.getRoles()
  }

  async getApiResources() {
    return this.logto.getApiResources()
  }

  async getOrganizationTemplate() {
    return this.logto.getOrganizationTemplate()
  }
}
