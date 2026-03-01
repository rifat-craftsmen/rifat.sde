import 'dotenv/config'
import { Client, GatewayIntentBits, Collection } from 'discord.js'
import { loadCommands } from './lib/commandLoader.js'
import type { Command } from './lib/types.js'

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

export const commands = new Collection<string, Command>()

client.once('ready', async (c) => {
  await loadCommands(commands)
  console.log(`Bot ready: ${c.user.tag} — ${commands.size} command(s) loaded`)
})

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  const command = commands.get(interaction.commandName)
  if (!command) {
    console.warn(`Unknown command: ${interaction.commandName}`)
    return
  }

  try {
    await command.execute(interaction)
  } catch (err) {
    console.error(`Error in /${interaction.commandName}:`, err)
    const reply = { content: 'Something went wrong. Please try again.', ephemeral: true }
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply)
    } else {
      await interaction.reply(reply)
    }
  }
})

client.login(process.env.DISCORD_TOKEN)
