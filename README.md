# Logto JWT POC — NestJS

復刻 hermes-api Logto Experience API flow，並測試 Logto RBAC、Organization、API Resources 功能的 POC 專案。

---

## 架構設計

```
src/
├── common/
│   └── logto.config.ts          # ConfigModule 載入 env 設定
├── logto/
│   ├── logto.module.ts
│   └── logto.service.ts         # 所有 Logto HTTP 互動（M2M、Experience API、JWKS）
└── modules/
    ├── auth/                    # Experience API Flow（Phone OTP Login）
    │   ├── dto/
    │   ├── store/session.store.ts   # In-memory session（POC）
    │   ├── auth.service.ts
    │   └── auth.controller.ts
    ├── token/                   # JWT 驗證與 decode
    ├── user/                    # User Management（Management API）
    ├── organization/            # Organization 管理（多租戶）
    └── rbac/                    # RBAC — 角色、API Resources、Organization Template
```

---

## 快速開始

### 1. 複製環境變數

```bash
cp .env.example .env
```

編輯 `.env`，填入 Logto 設定（參考 `.env.example` 說明）。

### 2. Logto Console 前置設定

1. **建立 API Resource**（indicator = `LOGTO_API_RESOURCE`），定義 scopes
2. **建立 M2M Application**（Management API 用）→ 填 `LOGTO_CLIENT_ID/SECRET`
3. **建立 Web Application**（Experience flow 用）→ 填 `LOGTO_WEB_CLIENT_ID/SECRET`，開啟 `offline_access`
4. （可選）**建立 Organization Template** — 角色、組織權限
5. （可選）**建立 Global Roles** — 指派 API Resource scopes

### 3. 啟動服務

```bash
npm install
npm run start:dev
```

- API Server: http://localhost:3000
- **Swagger UI: http://localhost:3000/api** ← 推薦使用 Swagger 測試

---

## API 一覽

### Auth — Experience API Flow（對應 hermes-api）

| 端點 | 對應 hermes-api |
|---|---|
| `POST /auth/send-otp` | `sendAuthSmsForSentry` → `initiatePhoneOtpForExperienceFlow` |
| `POST /auth/verify-otp` | `verifyAuthSmsForSentry` → `verifyPhoneOtpForExperienceFlow` |
| `POST /auth/exchange` | `exchange` → `submitExperienceAndIssueToken` |
| `POST /auth/refresh` | `genUserTokens`（支援 org-scoped token） |

### Token — JWT 驗證

| 端點 | 說明 |
|---|---|
| `POST /token/validate` | JWKS 驗簽 + iss/aud/scope 驗證 |
| `GET /token/decode` | Decode JWT claims（不驗簽） |

### Users / Organizations / RBAC

```
GET/POST/DELETE /users
GET/POST/DELETE /organizations
GET/POST/DELETE /organizations/:orgId/members
GET /rbac/roles
GET /rbac/resources
GET /rbac/organization-template
```

---

## 參考文件

- [Logto RBAC](https://docs.logto.io/zh-TW/authorization/role-based-access-control)
- [Organization Template](https://docs.logto.io/zh-TW/authorization/organization-template)
- [Global API Resources](https://docs.logto.io/zh-TW/authorization/global-api-resources)
- [Validate Access Tokens](https://docs.logto.io/zh-TW/authorization/validate-access-tokens)
- [Logto OpenAPI](https://openapi.logto.io/)
