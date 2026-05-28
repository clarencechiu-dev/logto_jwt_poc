import { Module } from '@nestjs/common'
import { LogtoModule } from '../../logto/logto.module'
import { OrganizationController } from './organization.controller'
import { OrganizationService } from './organization.service'

@Module({
  imports: [LogtoModule],
  controllers: [OrganizationController],
  providers: [OrganizationService]
})
export class OrganizationModule {}
