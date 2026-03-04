import 'dotenv/config'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v10'
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10'

/**
 * Registers slash commands with the Discord API.
 * Run with: npm run deploy-commands
 *
 * Commands are imported and added to this array as each feature is built.
 * For global deployment, swap applicationGuildCommands → applicationCommands
 * (global commands take up to 1 hour to propagate).
 */
const commands: RESTPostAPIApplicationCommandsJSONBody[] = [
  // TODO: import and add command definitions here (F2+)
]

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!)

console.log(`Deploying ${commands.length} command(s) to guild ${process.env.DISCORD_GUILD_ID}...`)

await rest.put(
  Routes.applicationGuildCommands(
    process.env.DISCORD_CLIENT_ID!,
    process.env.DISCORD_GUILD_ID!,
  ),
  { body: commands },
)

console.log('Done.')
