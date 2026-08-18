import { Response } from 'express'
import { AuthRequest } from '../types/index.js'
import { getHeadcount, formatHeadcountMessage } from '../services/headcountService.js'
import { getTodayString } from '../utils/dateHelpers.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function handleHeadcount(req: AuthRequest, res: Response): Promise<void> {
  const role = req.user!.role
  if (role !== 'ADMIN' && role !== 'LOGISTICS') {
    res.json({ type: 4, data: { content: 'Only admins and logistics members can view headcount.', flags: 64 } })
    return
  }

  let date: string
  if (req.user!.platform === 'google') {
    const arg = (req.body?.message?.argumentText as string ?? '').trim()
    date = arg || getTodayString()
  } else {
    const options: Array<{ name: string; value: string }> = req.body.data?.options ?? []
    date = options.find(o => o.name === 'date')?.value ?? getTodayString()
  }

  if (!DATE_RE.test(date)) {
    res.json({ type: 4, data: { content: 'Invalid date format. Use YYYY-MM-DD.', flags: 64 } })
    return
  }

  const data    = await getHeadcount(date)
  const content = formatHeadcountMessage(data)

  if (!content) {
    res.json({ type: 4, data: { content: `No meal records found for **${date}**.` } })
    return
  }

  res.json({ type: 4, data: { content } })
}
