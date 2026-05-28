import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import logtoConfig from './common/logto.config'
import { AppService } from './app.service'
import { AuthModule } from './modules/auth/auth.module'
import { TokenModule } from './modules/token/token.module'
import { UserModule } from './modules/user/user.module'
import { OrganizationModule } from './modules/organization/organization.module'
import { RbacModule } from './modules/rbac/rbac.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [logtoConfig]
    }),
    AuthModule,
    TokenModule,
    UserModule,
    OrganizationModule,
    RbacModule
  ],
  providers: [AppService]
})
export class AppModule {}
