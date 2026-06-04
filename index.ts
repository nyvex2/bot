import {
  Client,
  Interaction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  Guild
} from "discord.js";

import { config } from "./config";

let clientInstance: Client;

export function setTicketClient(client: Client) {
  clientInstance = client;
}

// ─────────────────────────────
// CREATE TICKET (FIXED)
// ─────────────────────────────
export async function createTicket(
  guildId: string,
  userId: string,
  order: any
) {
  try {
    console.log("📦 Creating ticket...");
    console.log("Guild ID:", guildId);

    // 🔥 FIX: always fetch guild properly (cache OR API)
    const guild: Guild =
      clientInstance.guilds.cache.get(guildId) ||
      (await clientInstance.guilds.fetch(guildId));

    if (!guild) {
      console.log("❌ Guild not found");
      return;
    }

    console.log("✅ Guild found:", guild.name);

    const ownerRole = guild.roles.cache.find(
      r => r.name === config.ownerRoleName
    );

    // 🔥 FIX: safer channel creation
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
        },
        ...(ownerRole
          ? [
              {
                id: ownerRole.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ReadMessageHistory
                ]
              }
            ]
          : [])
      ]
    });

    console.log("✅ Ticket created:", channel.name);

    const embed = new EmbedBuilder()
      .setTitle(`🧾 Order #${order.orderId}`)
      .setColor(0x00ff99)
      .addFields(
        { name: "User", value: `<@${userId}>`, inline: true },
        { name: "Category", value: order.category || "N/A", inline: true },
        { name: "Service", value: order.service || "N/A", inline: true },
        { name: "Budget", value: order.budget || "N/A", inline: true }
      )
      .setTimestamp();

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
      content: ownerRole ? `<@&${ownerRole.id}>` : "",
      embeds: [embed],
      components: [row]
    });

    return channel;
  } catch (err) {
    console.error("❌ createTicket error:", err);
  }
}

// ─────────────────────────────
// BUTTON HANDLERS (FIXED)
// ─────────────────────────────
export async function handleTicketButtons(i: Interaction) {
  if (!i.isButton()) return;

  const [action, id] = i.customId.split("_");

  if (action === "claim") {
    return i.reply({
      content: `📌 Order #${id} claimed by ${i.user}`,
      ephemeral: false
    });
  }

  if (action === "close") {
    await i.reply({
      content: "🔒 Closing ticket in 3 seconds..."
    });

    setTimeout(async () => {
      try {
        await i.channel?.delete();
      } catch (err) {
        console.log("❌ Failed to delete channel:", err);
      }
    }, 3000);
  }
}
