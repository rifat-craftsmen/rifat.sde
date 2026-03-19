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
  {
    name: 'update-schedule',
    description: 'Update an existing meal schedule (Admin only)',
    options: [
      {
        name: 'date',
        description: 'Date of the schedule to update (YYYY-MM-DD)',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'lunch_enabled',
        description: 'Enable or disable lunch',
        type: ApplicationCommandOptionType.Boolean,
        required: false,
      },
      {
        name: 'snacks_enabled',
        description: 'Enable or disable snacks',
        type: ApplicationCommandOptionType.Boolean,
        required: false,
      },
      {
        name: 'iftar_enabled',
        description: 'Enable or disable iftar',
        type: ApplicationCommandOptionType.Boolean,
        required: false,
      },
      {
        name: 'event_dinner_enabled',
        description: 'Enable or disable event dinner',
        type: ApplicationCommandOptionType.Boolean,
        required: false,
      },
      {
        name: 'optional_dinner_enabled',
        description: 'Enable or disable optional dinner',
        type: ApplicationCommandOptionType.Boolean,
        required: false,
      },
      {
        name: 'occasion_name',
        description: 'Update the occasion name',
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },

  // ── F6: WFH Period Management ─────────────────────────────────────────────
  {
    name: 'set-wfh-period',
    description: 'Create a company-wide WFH period (Admin only)',
    options: [
      {
        name: 'date_from',
        description: 'Start date in YYYY-MM-DD format',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'date_to',
        description: 'End date in YYYY-MM-DD format',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'note',
        description: 'Optional note (e.g. "Eid holidays")',
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },
  {
    name: 'list-wfh-periods',
    description: 'List all WFH periods (Admin only)',
  },
  {
    name: 'update-wfh-period',
    description: 'Update an existing WFH period (Admin only)',
    options: [
      {
        name: 'id',
        description: 'WFH period ID (from /list-wfh-periods)',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'date_from',
        description: 'New start date in YYYY-MM-DD format',
        type: ApplicationCommandOptionType.String,
        required: false,
      },
      {
        name: 'date_to',
        description: 'New end date in YYYY-MM-DD format',
        type: ApplicationCommandOptionType.String,
        required: false,
      },
      {
        name: 'note',
        description: 'New note',
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },
  {
    name: 'delete-wfh-period',
    description: 'Delete a WFH period by ID (Admin only)',
    options: [
      {
        name: 'id',
        description: 'WFH period ID (from /list-wfh-periods)',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  // ── F4: Employee Meal Choices ──────────────────────────────────────────────
  {
    name: 'create-meal',
    description: 'Set your meal choices for a future weekday',
    options: [
      {
        name: 'date',
        description: 'Date in YYYY-MM-DD format',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'lunch',
        description: 'Opt in or out of lunch',
        type: ApplicationCommandOptionType.Boolean,
        required: false,
      },
      {
        name: 'snacks',
        description: 'Opt in or out of snacks',
        type: ApplicationCommandOptionType.Boolean,
        required: false,
      },
      {
        name: 'iftar',
        description: 'Opt in or out of iftar',
        type: ApplicationCommandOptionType.Boolean,
        required: false,
      },
      {
        name: 'event_dinner',
        description: 'Opt in or out of event dinner',
        type: ApplicationCommandOptionType.Boolean,
        required: false,
      },
      {
        name: 'optional_dinner',
        description: 'Opt in or out of optional dinner',
        type: ApplicationCommandOptionType.Boolean,
        required: false,
      },
      {
        name: 'work_from_home',
        description: 'Are you working from home this day?',
        type: ApplicationCommandOptionType.Boolean,
        required: false,
      },
    ],
  },
  {
    name: 'update-meal',
    description: 'Update your meal choices for a future weekday',
    options: [
      {
        name: 'date',
        description: 'Date in YYYY-MM-DD format',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'lunch',
        description: 'Opt in or out of lunch',
        type: ApplicationCommandOptionType.Boolean,
        required: false,
      },
      {
        name: 'snacks',
        description: 'Opt in or out of snacks',
        type: ApplicationCommandOptionType.Boolean,
        required: false,
      },
      {
        name: 'iftar',
        description: 'Opt in or out of iftar',
        type: ApplicationCommandOptionType.Boolean,
        required: false,
      },
      {
        name: 'event_dinner',
        description: 'Opt in or out of event dinner',
        type: ApplicationCommandOptionType.Boolean,
        required: false,
      },
      {
        name: 'optional_dinner',
        description: 'Opt in or out of optional dinner',
        type: ApplicationCommandOptionType.Boolean,
        required: false,
      },
      {
        name: 'work_from_home',
        description: 'Are you working from home this day?',
        type: ApplicationCommandOptionType.Boolean,
        required: false,
      },
    ],
  },
]


const token = process.env.DISCORD_TOKEN
const clientId = process.env.DISCORD_CLIENT_ID
const guildId = process.env.DISCORD_GUILD_ID

if (!token || !clientId || !guildId) {
  throw new Error('Missing required environment variables: DISCORD_TOKEN, DISCORD_CLIENT_ID, or DISCORD_GUILD_ID')
}

const rest = new REST({ version: '10' }).setToken(token)


console.log(`Deploying ${commands.length} command(s) to guild ${guildId}...`)

await rest.put(
  Routes.applicationGuildCommands(
    clientId,
    guildId,
  ),
  { body: commands },
)

console.log('Done.')
