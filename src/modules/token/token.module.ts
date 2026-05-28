import { Module } from '@nestjs/common'
import { LogtoModule } from '../../logto/logto.module'
import { TokenController } from './token.controller'
import { TokenService } from './token.service'

@Module({
  imports: [LogtoModule],
  controllers: [TokenController],
  providers: [TokenService]
})
export class TokenModule {}
