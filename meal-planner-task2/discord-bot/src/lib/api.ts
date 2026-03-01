import type { GuildMember } from 'discord.js'
import type { Role } from './types.js'

// ── Error class ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function apiCall<T>(
  method: string,
  path: string,
  discordId: string,
  discordRole: Role,
  body?: unknown,
): Promise<T> {
  const url = `${process.env.API_URL}${path}`

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type':   'application/json',
      'X-Bot-Secret':   process.env.BOT_SECRET ?? '',
      'X-Discord-Id':   discordId,
      'X-Discord-Role': discordRole,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const payload = await res.json().catch(() => ({})) as { error?: string }
    throw new ApiError(res.status, payload.error ?? res.statusText)
  }

  return res.json() as Promise<T>
}

// ── Per-interaction client ────────────────────────────────────────────────────
// Usage in commands:
//   const api = createApiClient(interaction.user.id, getAppRole(member))
//   const data = await api.get<MyType>('/api/meals/my-schedule')

export function createApiClient(discordId: string, discordRole: Role) {
  return {
    get:    <T>(path: string)                => apiCall<T>('GET',    path, discordId, discordRole),
    post:   <T>(path: string, body: unknown) => apiCall<T>('POST',   path, discordId, discordRole, body),
    put:    <T>(path: string, body: unknown) => apiCall<T>('PUT',    path, discordId, discordRole, body),
    delete: <T>(path: string)               => apiCall<T>('DELETE', path, discordId, discordRole),
  }
}

// ── Discord role → app role mapping ──────────────────────────────────────────
// Checks Discord server role names. Roles are checked highest-privilege first.

export function getAppRole(member: GuildMember): Role {
  const names = member.roles.cache.map(r => r.name)
  if (names.includes('ADMIN'))     return 'ADMIN'
  if (names.includes('LEAD'))      return 'LEAD'
  if (names.includes('LOGISTICS')) return 'LOGISTICS'
  return 'EMPLOYEE'
}
