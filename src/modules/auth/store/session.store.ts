/**
 * SessionStore（In-memory，POC 用）
 *
 * 儲存 Experience API flow 中跨請求需要的資料：
 * - sessionCookie（Logto interaction session）
 * - verificationId（OTP 對應的 ID）
 * - codeVerifier / state（PKCE）
 *
 * 生產環境應替換為 Redis 等外部 cache。
 */

import { Injectable } from '@nestjs/common'

export type AuthFlow = 'register' | 'login' | 'changeDevice'

export interface SessionEntry {
  // --- Phase 1: login 初始化 ---
  sentryToken: string
  authFlow: AuthFlow
  idCard: string
  deviceId: string
  fcmToken: string
  userAgent: string
  createdAt: number

  // --- Phase 2: send-otp 補充 ---
  phone?: string
  verificationId?: string
  sessionCookie?: string
  codeVerifier?: string
  state?: string
  resource?: string
  scopes?: string[]
  phoneVerifiedAt?: number
}

@Injectable()
export class SessionStore {
  private readonly store = new Map<string, SessionEntry>()
  private readonly TTL_MS = 10 * 60 * 1000 // 10 分鐘

  set(sentryToken: string, entry: SessionEntry): void {
    this.store.set(sentryToken, entry)
  }

  get(sentryToken: string): SessionEntry | undefined {
    const entry = this.store.get(sentryToken)
    if (!entry) return undefined

    if (Date.now() - entry.createdAt > this.TTL_MS) {
      this.store.delete(sentryToken)
      return undefined
    }

    return entry
  }

  patch(sentryToken: string, partial: Partial<SessionEntry>): void {
    const existing = this.store.get(sentryToken)
    if (existing) {
      this.store.set(sentryToken, { ...existing, ...partial })
    }
  }

  delete(sentryToken: string): void {
    this.store.delete(sentryToken)
  }
}
