import {
  Client,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} from "discord.js";

import { config } from "./config";

let client: Client;

export function setTicketClient(c: Client) {
  client = c;
}

export async function createTicket(
  guildId: string,
  userId: string,
  order: any
) {
  const guild =
    client.guilds.cache.get(guildId) ||
    (await client.guilds.fetch(guildId).catch(() => null));

  if (!guild) {
    console.log("❌ Guild not found");
    return;
  }

  const channel = await guild.channels.create({
    name: `order-${order.orderId}`,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: userId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      }
    ]
  });

  const embed = new EmbedBuilder()
    .setTitle(`🧾 Order #${order.orderId}`)
    .setColor(0x00ff99)
    .addFields(
      { name: "User", value: `<@${userId}>` },
      { name: "Category", value: order.category || "N/A" },
      { name: "Service", value: order.service || "N/A" },
      { name: "Budget", value: order.budget || "N/A" }
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`claim_${order.orderId}`)
      .setLabel("Claim")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`close_${order.orderId}`)
      .setLabel("Close")
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: config.ownerRoleName ? `@${config.ownerRoleName}` : "",
    embeds: [embed],
    components: [row]
  });

  return channel;
}
