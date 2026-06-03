import {
  Client,
  GatewayIntentBits,
  Partials,
  Interaction,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";

import { handleOrder } from "./orderFlow";
import { handleTicketButtons } from "./ticket";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// ─────────────────────────────
// AUTO SLASH COMMAND REGISTER (FIX)
// ─────────────────────────────
async function registerCommands() {
  const TOKEN = process.env.TOKEN!;
  const CLIENT_ID = process.env.CLIENT_ID!;
  const GUILD_ID = process.env.GUILD_ID!;

  if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.log("❌ Missing env variables for slash commands");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  const commands = [
    new SlashCommandBuilder()
      .setName("order")
      .setDescription("Start an order system")
      .toJSON()
  ];

  try {
    console.log("🔄 Registering slash commands...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("✅ Slash commands registered successfully");
  } catch (err) {
    console.error("❌ Failed to register commands:", err);
  }
}

// ─────────────────────────────
// BOT READY
// ─────────────────────────────
client.once("ready", async () => {
  console.log(`🤖 Logged in as ${client.user?.tag}`);

  // IMPORTANT: this fixes your issue on Railway
  await registerCommands();
});

// ─────────────────────────────
// INTERACTION HANDLER
// ─────────────────────────────
client.on("interactionCreate", async (interaction: Interaction) => {
  try {
    // slash command
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "order") {
        return handleOrder(interaction);
      }
    }

    // select menus + buttons for order system
    if (interaction.isStringSelectMenu() || interaction.isButton()) {
      return handleOrder(interaction);
    }

    // ticket buttons (claim/close)
    if (interaction.isButton()) {
      return handleTicketButtons(interaction);
    }
  } catch (err) {
    console.error("Interaction error:", err);
  }
});

// ─────────────────────────────
// LOGIN
// ─────────────────────────────
client.login(process.env.TOKEN);
