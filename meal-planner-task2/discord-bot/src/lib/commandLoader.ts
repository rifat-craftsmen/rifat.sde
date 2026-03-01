import { readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { Collection } from 'discord.js'
import type { Command } from './types.js'

export async function loadCommands(commands: Collection<string, Command>): Promise<void> {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const commandsDir = join(__dirname, '../commands')

  const files = readdirSync(commandsDir).filter(
    f => (f.endsWith('.ts') || f.endsWith('.js')) && !f.startsWith('.'),
  )

  for (const file of files) {
    const mod = await import(join(commandsDir, file)) as { default: Command }
    commands.set(mod.default.data.name, mod.default)
  }
}
