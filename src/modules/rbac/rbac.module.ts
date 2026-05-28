import { Module } from '@nestjs/common'
import { LogtoModule } from '../../logto/logto.module'
import { RbacController } from './rbac.controller'
import { RbacService } from './rbac.service'

@Module({
  imports: [LogtoModule],
  controllers: [RbacController],
  providers: [RbacService]
})
export class RbacModule {}
