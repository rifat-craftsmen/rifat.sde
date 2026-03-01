import 'dotenv/config'
import { REST, Routes } from 'discord.js'
import { readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { Command } from './lib/types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const commandsDir = join(__dirname, 'commands')

// Collect toJSON() payloads from every command file
const commandFiles = readdirSync(commandsDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'))
const body: unknown[] = []

for (const file of commandFiles) {
  const mod = await import(join(commandsDir, file)) as { default: Command }
  body.push(mod.default.data.toJSON())
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN!)

console.log(`Deploying ${body.length} command(s) to guild ${process.env.DISCORD_GUILD_ID}...`)

await rest.put(
  Routes.applicationGuildCommands(
    process.env.DISCORD_CLIENT_ID!,
    process.env.DISCORD_GUILD_ID!,
  ),
  { body },
)

console.log('Done.')
