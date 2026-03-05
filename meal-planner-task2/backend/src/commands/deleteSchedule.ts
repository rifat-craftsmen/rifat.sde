import { Response } from 'express'
import { AuthRequest } from '../types/index.js'
import { deleteMealSchedule } from '../services/adminService.js'

export async function handleDeleteSchedule(req: AuthRequest, res: Response): Promise<void> {
  if (req.user!.role !== 'ADMIN') {
    res.json({ type: 4, data: { content: 'Only admins can delete schedules.', flags: 64 } })
    return
  }

  const options: Array<{ name: string; value: string }> = req.body.data?.options ?? []
  const date = options.find(o => o.name === 'date')?.value ?? ''

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.json({ type: 4, data: { content: 'Invalid date format. Use YYYY-MM-DD.', flags: 64 } })
    return
  }

  await deleteMealSchedule(date)
  res.json({ type: 4, data: { content: `Schedule for **${date}** deleted.`, flags: 64 } })
}
