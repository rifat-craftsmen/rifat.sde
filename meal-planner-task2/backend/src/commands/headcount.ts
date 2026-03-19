import { Response } from 'express'
import { AuthRequest } from '../types/index.js'
import { getHeadcount } from '../services/headcountService.js'
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

  const data = await getHeadcount(date)

  if (data.overallTotal === 0) {
    res.json({ type: 4, data: { content: `No meal records found for **${date}**.` } })
    return
  }

  const occasionLine = data.occasionName ? ` — *${data.occasionName}*` : ''
  const { mealTotals: m, workLocationSplit: w } = data

  const mealLine = [
    m.lunch          > 0 && `🍱 Lunch: **${m.lunch}**`,
    m.snacks         > 0 && `🍪 Snacks: **${m.snacks}**`,
    m.iftar          > 0 && `🌙 Iftar: **${m.iftar}**`,
    m.eventDinner    > 0 && `🍽️ Event Dinner: **${m.eventDinner}**`,
    m.optionalDinner > 0 && `🥘 Optional Dinner: **${m.optionalDinner}**`,
  ].filter(Boolean).join('  ') || 'No meals opted in.'

  const teamLines = data.teamBreakdown.map(t => {
    const meals = [
      t.lunch          > 0 && `L:${t.lunch}`,
      t.snacks         > 0 && `S:${t.snacks}`,
      t.iftar          > 0 && `I:${t.iftar}`,
      t.eventDinner    > 0 && `ED:${t.eventDinner}`,
      t.optionalDinner > 0 && `OD:${t.optionalDinner}`,
    ].filter(Boolean).join(' ') || 'none'
    return `  **${t.teamName}** (${t.totalMembers}) — ${meals}`
  })

  const lines = [
    `📊 **Headcount — ${date}**${occasionLine}`,
    ``,
    `🏢 Office: **${w.office}**  🏠 WFH: **${w.wfh}**  👥 Total: **${data.overallTotal}**`,
    ``,
    mealLine,
    teamLines.length > 0 ? `\n**By team:**\n${teamLines.join('\n')}` : '',
  ].filter(s => s !== '').join('\n')

  res.json({ type: 4, data: { content: lines } })
}
