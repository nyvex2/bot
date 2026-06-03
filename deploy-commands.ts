import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { config } from "./config";

const commands = [
  new SlashCommandBuilder()
    .setName("order")
    .setDescription("Start an order session")
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(config.token);

(async () => {
  try {
    console.log("🔄 Registering slash commands...");

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID!),
      { body: commands }
    );

    console.log("✅ Slash commands registered!");
  } catch (err) {
    console.error(err);
  }
})();
