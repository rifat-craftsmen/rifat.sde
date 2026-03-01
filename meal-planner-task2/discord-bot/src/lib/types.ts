import type { ChatInputCommandInteraction } from 'discord.js'

export type Role = 'EMPLOYEE' | 'LEAD' | 'ADMIN' | 'LOGISTICS'

export interface Command {
  data: { name: string; toJSON(): unknown }
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>
}
