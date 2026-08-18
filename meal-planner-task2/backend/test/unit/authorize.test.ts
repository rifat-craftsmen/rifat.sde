import { describe, it, expect, vi } from 'vitest'
import type { Response, NextFunction, Request } from 'express'
import { requireRole } from '../../src/middleware/authorize.js'

// Minimal helpers to capture Express responses without spinning up the server.
function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as any,
    status(code: number) { this.statusCode = code; return this },
    json(payload: any) { this.body = payload; return this },
  }
  return res as unknown as Response
}

describe('requireRole middleware', () => {
  it('returns 401 when req.user is absent (unauthenticated)', () => {
    const req = { user: undefined } as any
    const res = mockRes()
    const next = vi.fn()
    requireRole('ADMIN')(req as Request, res, next as NextFunction)
    expect(res.statusCode).toBe(401)
    expect((res as any).body).toEqual({ error: 'Authentication required' })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 403 when the role is not allowed', () => {
    const req = { user: { discordId: 'u', role: 'EMPLOYEE', platform: 'discord' } } as any
    const res = mockRes()
    const next = vi.fn()
    requireRole('ADMIN', 'LEAD')(req as Request, res, next as NextFunction)
    expect(res.statusCode).toBe(403)
    expect((res as any).body).toEqual({ error: 'Insufficient permissions' })
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next() when the role is allowed', () => {
    const req = { user: { discordId: 'u', role: 'LEAD', platform: 'discord' } } as any
    const res = mockRes()
    const next = vi.fn()
    requireRole('ADMIN', 'LEAD')(req as Request, res, next as NextFunction)
    expect(res.statusCode).toBe(200) // untouched
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('grants access only to the exact allowed role set', () => {
    const req = { user: { discordId: 'u', role: 'LOGISTICS', platform: 'discord' } } as any
    // LOGISTICS not in an ADMIN-only set → 403
    const denied = mockRes()
    requireRole('ADMIN')(req as Request, denied, vi.fn())
    expect(denied.statusCode).toBe(403)
    // explicit allow for LOGISTICS → next()
    const next2 = vi.fn()
    requireRole('LOGISTICS')(req as Request, mockRes(), next2 as NextFunction)
    expect(next2).toHaveBeenCalledTimes(1)
  })
})
