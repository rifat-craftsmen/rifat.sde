import { Response } from 'express'
import { AuthRequest } from '../types/index.js'
import { getAllMealSchedules } from '../services/adminService.js'

export async function handleListSchedules(_req: AuthRequest, res: Response): Promise<void> {
  const schedules = await getAllMealSchedules()

  if (schedules.length === 0) {
    res.json({ type: 4, data: { content: 'No upcoming meal schedules found.', flags: 64 } })
    return
  }

  const lines = schedules.map(s => {
    const meals = [
      s.lunchEnabled         && 'L',
      s.snacksEnabled        && 'S',
      s.iftarEnabled         && 'I',
      s.eventDinnerEnabled   && 'ED',
      s.optionalDinnerEnabled && 'OD',
    ].filter(Boolean).join(' ')
    const occasion = s.occasionName ? ` *(${s.occasionName})*` : ''
    return `**${s.date}** — ${meals || 'none'}${occasion}`
  })

  res.json({
    type: 4,
    data: {
      content: `**Upcoming meal schedules:**\n${lines.join('\n')}\n\n*L=Lunch S=Snacks I=Iftar ED=EventDinner OD=OptionalDinner*`,
      flags: 64,
    },
  })
}
