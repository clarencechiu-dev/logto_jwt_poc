import { Module } from '@nestjs/common'
import { LogtoModule } from '../../logto/logto.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { SessionStore } from './store/session.store'

@Module({
  imports: [LogtoModule],
  controllers: [AuthController],
  providers: [AuthService, SessionStore]
})
export class AuthModule {}
