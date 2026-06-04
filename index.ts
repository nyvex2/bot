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
import { connectDB } from "./db";

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
// SLASH COMMAND REGISTRATION
// ─────────────────────────────
async function registerCommands() {
  const TOKEN = process.env.TOKEN;
  const CLIENT_ID = process.env.CLIENT_ID;
  const GUILD_ID = process.env.GUILD_ID;

  if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.log("❌ Missing TOKEN, CLIENT_ID or GUILD_ID");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  const commands = [
    new SlashCommandBuilder()
      .setName("order")
      .setDescription("Start an order")
      .toJSON()
  ];

  try {
    console.log("🔄 Registering slash commands...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("✅ Slash commands registered");
  } catch (error) {
    console.error("❌ Command registration failed:", error);
  }
}

// ─────────────────────────────
// READY
// ─────────────────────────────
client.once("ready", async () => {
  console.log(`🤖 Logged in as ${client.user?.tag}`);

  try {
    await connectDB();
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
  }

  await registerCommands();
});

// ─────────────────────────────
// INTERACTIONS
// ─────────────────────────────
client.on("interactionCreate", async (interaction: Interaction) => {
  try {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "order") {
        return handleOrder(interaction);
      }
    }

    // Select menus belong to order flow
    if (interaction.isStringSelectMenu()) {
      return handleOrder(interaction);
    }

    // Buttons
    if (interaction.isButton()) {
      // Ticket buttons
      if (
        interaction.customId.startsWith("claim_") ||
        interaction.customId.startsWith("close_")
      ) {
        return handleTicketButtons(interaction);
      }

      // Order buttons (submit, confirm, etc.)
      return handleOrder(interaction);
    }
  } catch (error) {
    console.error("❌ Interaction error:", error);

    try {
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ An unexpected error occurred.",
          ephemeral: true
        });
      }
    } catch {}
  }
});

// ─────────────────────────────
// LOGIN
// ─────────────────────────────
client.login(process.env.TOKEN);
