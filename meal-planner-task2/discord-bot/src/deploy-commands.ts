import 'dotenv/config'
import { REST } from '@discordjs/rest'
import { Routes, ApplicationCommandOptionType } from 'discord-api-types/v10'
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
  // ── F3: Employee Schedule View ────────────────────────────────────────────
  {
    name: 'my-schedule',
    description: 'View your 7-day meal schedule and current selections',
  },

  // ── F2: Meal Schedule Management ──────────────────────────────────────────
  {
    name: 'create-schedule',
    description: 'Create a meal schedule for a future date (Admin only)',
    options: [
      {
        name: 'date',
        description: 'Date in YYYY-MM-DD format (must be tomorrow or later)',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'lunch_enabled',
        description: 'Enable lunch for this date?',
        type: ApplicationCommandOptionType.Boolean,
        required: true,
      },
      {
        name: 'snacks_enabled',
        description: 'Enable snacks for this date?',
        type: ApplicationCommandOptionType.Boolean,
        required: true,
      },
      {
        name: 'iftar_enabled',
        description: 'Enable iftar for this date?',
        type: ApplicationCommandOptionType.Boolean,
        required: true,
      },
      {
        name: 'event_dinner_enabled',
        description: 'Enable event dinner for this date?',
        type: ApplicationCommandOptionType.Boolean,
        required: true,
      },
      {
        name: 'optional_dinner_enabled',
        description: 'Enable optional dinner for this date?',
        type: ApplicationCommandOptionType.Boolean,
        required: true,
      },
      {
        name: 'occasion_name',
        description: 'Optional occasion name (e.g. "Team offsite")',
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },
  {
    name: 'list-schedules',
    description: 'List all upcoming meal schedules',
  },
  {
    name: 'delete-schedule',
    description: 'Delete a meal schedule by date (Admin only)',
    options: [
      {
        name: 'date',
        description: 'Date in YYYY-MM-DD format',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
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
