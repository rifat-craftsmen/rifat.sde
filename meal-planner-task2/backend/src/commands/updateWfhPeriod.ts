import { Response } from 'express'
import { AuthRequest } from '../types/index.js'
import { updateWfhPeriod } from '../services/wfhService.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function handleUpdateWfhPeriod(req: AuthRequest, res: Response): Promise<void> {
  if (req.user!.role !== 'ADMIN') {
    res.json({ type: 4, data: { content: 'Only admins can update WFH periods.', flags: 64 } })
    return
  }

  let id:       string
  let dateFrom: string | undefined
  let dateTo:   string | undefined
  let note:     string | undefined

  if (req.user!.platform === 'google') {
    const argText = (req.body?.message?.argumentText as string ?? '').trim()
    const noteMatch     = argText.match(/note:([^\s].*)/)
    const dateFromMatch = argText.match(/datefrom:(\d{4}-\d{2}-\d{2})/)
    const dateToMatch   = argText.match(/dateto:(\d{4}-\d{2}-\d{2})/)
    note     = noteMatch     ? noteMatch[1].trim()     : undefined
    dateFrom = dateFromMatch ? dateFromMatch[1]         : undefined
    dateTo   = dateToMatch   ? dateToMatch[1]           : undefined
    // id is the first token before any key:value pairs
    id = argText.split(/\s+/)[0] ?? ''
  } else {
    const options: Array<{ name: string; value: string }> = req.body.data?.options ?? []
    const opt = (name: string) => options.find(o => o.name === name)?.value
    id       = opt('id')        ?? ''
    dateFrom = opt('date_from')
    dateTo   = opt('date_to')
    note     = opt('note')
  }

  if (!id) {
    res.json({ type: 4, data: { content: 'Provide the WFH period ID (use `/list-wfh-periods` to find it).', flags: 64 } })
    return
  }

  if (dateFrom !== undefined && !DATE_RE.test(dateFrom)) {
    res.json({ type: 4, data: { content: 'Invalid `date_from` format. Use YYYY-MM-DD.', flags: 64 } })
    return
  }
  if (dateTo !== undefined && !DATE_RE.test(dateTo)) {
    res.json({ type: 4, data: { content: 'Invalid `date_to` format. Use YYYY-MM-DD.', flags: 64 } })
    return
  }
  if (dateFrom !== undefined && dateTo !== undefined && dateTo < dateFrom) {
    res.json({ type: 4, data: { content: '`date_to` must be on or after `date_from`.', flags: 64 } })
    return
  }

  const hasUpdate = [dateFrom, dateTo, note].some(v => v !== undefined)
  if (!hasUpdate) {
    res.json({ type: 4, data: { content: 'Provide at least one field to update (`date_from`, `date_to`, or `note`).', flags: 64 } })
    return
  }

  try {
    await updateWfhPeriod(id, { dateFrom, dateTo, note }, req.user!.discordId)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'WFH period not found') {
      res.json({ type: 4, data: { content: `No WFH period found with id \`${id}\`. Use \`/list-wfh-periods\` to check.`, flags: 64 } })
      return
    }
    throw e
  }

  res.json({ type: 4, data: { content: `WFH period \`${id}\` updated.`, flags: 64 } })
}
