import { Response } from 'express'
import { AuthRequest } from '../types/index.js'
import { createWfhPeriod } from '../services/wfhService.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function handleSetWfhPeriod(req: AuthRequest, res: Response): Promise<void> {
  if (req.user!.role !== 'ADMIN') {
    res.json({ type: 4, data: { content: 'Only admins can set WFH periods.', flags: 64 } })
    return
  }

  let dateFrom: string
  let dateTo:   string
  let note:     string | undefined

  if (req.user!.platform === 'google') {
    const argText = (req.body?.message?.argumentText as string ?? '').trim()
    const noteMatch = argText.match(/note:(.+)/)
    note = noteMatch ? noteMatch[1].trim() : undefined
    const parts = argText.replace(/note:.+/, '').trim().split(/\s+/)
    dateFrom = parts[0] ?? ''
    dateTo   = parts[1] ?? ''
  } else {
    const options: Array<{ name: string; value: string }> = req.body.data?.options ?? []
    const opt = (name: string) => options.find(o => o.name === name)?.value
    dateFrom = opt('date_from') ?? ''
    dateTo   = opt('date_to')   ?? ''
    note     = opt('note')
  }

  if (!DATE_RE.test(dateFrom) || !DATE_RE.test(dateTo)) {
    res.json({ type: 4, data: { content: 'Invalid date format. Use YYYY-MM-DD.', flags: 64 } })
    return
  }
  if (dateTo < dateFrom) {
    res.json({ type: 4, data: { content: '`date_to` must be on or after `date_from`.', flags: 64 } })
    return
  }

  const period = await createWfhPeriod({ dateFrom, dateTo, note }, req.user!.discordId)

  const noteText = note ? ` — *${note}*` : ''
  const idText   = `\`id: ${period.id}\``
  res.json({
    type: 4,
    data: {
      content: `🏠 **WFH period set** ${idText}\n**${dateFrom}** → **${dateTo}**${noteText}`,
    },
  })
}
