import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }))

  // Swagger UI
  const config = new DocumentBuilder()
    .setTitle('Logto JWT POC')
    .setDescription(
      'NestJS POC 專案，復刻 hermes-api Logto Experience API flow，並測試 RBAC、Organization、API Resources 功能。\n\n' +
        '**認證流程：**\n' +
        '1. `POST /auth/send-otp` — 發送手機 OTP\n' +
        '2. `POST /auth/verify-otp` — 驗證 OTP\n' +
        '3. `POST /auth/exchange` — 換取 access_token + refresh_token\n' +
        '4. `POST /auth/refresh` — 刷新 token（可帶 organizationId 取得 org-scoped token）\n\n' +
        '**Token 驗證：**\n' +
        '- `POST /token/validate` — 用 JWKS 驗證 JWT\n' +
        '- `GET /token/decode` — 快速 decode JWT claims\n\n' +
        '**參考文件：** https://docs.logto.io/zh-TW/authorization/'
    )
    .setVersion('1.0')
    .addTag('auth', 'Experience API Flow（Phone OTP Login）')
    .addTag('token', 'JWT 驗證與 decode')
    .addTag('users', 'Logto User Management')
    .addTag('organizations', 'Organization（多租戶）管理')
    .addTag('rbac', 'RBAC — 角色、API Resources、Organization Template')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: { persistAuthorization: true }
  })

  const port = process.env.PORT ?? 3000
  await app.listen(port)
  console.log(`\n🚀 Logto JWT POC is running on: http://localhost:${port}`)
  console.log(`📖 Swagger UI: http://localhost:${port}/api\n`)
}
bootstrap()
