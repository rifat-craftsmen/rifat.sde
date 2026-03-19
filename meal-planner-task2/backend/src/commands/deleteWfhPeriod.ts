import { Response } from 'express'
import { AuthRequest } from '../types/index.js'
import { deleteWfhPeriod } from '../services/wfhService.js'

export async function handleDeleteWfhPeriod(req: AuthRequest, res: Response): Promise<void> {
  if (req.user!.role !== 'ADMIN') {
    res.json({ type: 4, data: { content: 'Only admins can delete WFH periods.', flags: 64 } })
    return
  }

  const id = req.user!.platform === 'google'
    ? (req.body?.message?.argumentText as string ?? '').trim()
    : (req.body.data?.options as Array<{ name: string; value: string }> ?? []).find(o => o.name === 'id')?.value ?? ''

  if (!id) {
    res.json({ type: 4, data: { content: 'Provide the WFH period ID (use `/list-wfh-periods` to find it).', flags: 64 } })
    return
  }

  try {
    await deleteWfhPeriod(id, req.user!.discordId)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'WFH period not found') {
      res.json({ type: 4, data: { content: `No WFH period found with id \`${id}\`. Use \`/list-wfh-periods\` to check.`, flags: 64 } })
      return
    }
    throw e
  }

  res.json({ type: 4, data: { content: `WFH period \`${id}\` deleted.`, flags: 64 } })
}
