import {
  Client,
  GatewayIntentBits,
  Partials,
  Interaction
} from "discord.js";

import { connectDB } from "./db";
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

client.once("ready", async () => {
  console.log(`🤖 Logged in as ${client.user?.tag}`);
  await connectDB();
});

client.on("interactionCreate", async (i: Interaction) => {
  if (i.isChatInputCommand() && i.commandName === "order") {
    return handleOrder(i);
  }

  if (i.isStringSelectMenu() || i.isButton()) {
    return handleOrder(i);
  }

  if (i.isButton()) {
    return handleTicketButtons(i);
  }
});

client.login(process.env.TOKEN);
