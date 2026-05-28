import { Module } from '@nestjs/common'
import { LogtoModule } from '../../logto/logto.module'
import { UserController } from './user.controller'
import { UserService } from './user.service'

@Module({
  imports: [LogtoModule],
  controllers: [UserController],
  providers: [UserService]
})
export class UserModule {}
