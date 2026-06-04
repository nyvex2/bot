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
    console.log("🟡 Creating ticket...");
    console.log("Guild ID:", guildId);

    if (!clientInstance) {
      console.log("❌ Client not set");
      return;
    }

    // ✅ FIX: cache + fetch fallback (IMPORTANT FOR RAILWAY)
    const guild: Guild | null =
      clientInstance.guilds.cache.get(guildId) ||
      (await clientInstance.guilds.fetch(guildId).catch(() => null));

    if (!guild) {
      console.log("❌ Guild not found or bot not in server:", guildId);
      return;
    }

    console.log("✅ Guild found:", guild.name);

    // ✅ Permission check
    const me = guild.members.me;
    if (!me?.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      console.log("❌ Bot missing Manage Channels permission");
      return;
    }

    const ownerRole = guild.roles.cache.find(
      r => r.name === config.ownerRoleName
    );

    // ─────────────────────────────
    // CHANNEL CREATION
    // ─────────────────────────────
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

    // ─────────────────────────────
    // EMBED
    // ─────────────────────────────
    const embed = new EmbedBuilder()
      .setTitle(`🧾 Order #${order.orderId}`)
      .setColor(0x00ff99)
      .addFields(
        {
          name: "Customer",
          value: `<@${userId}>`,
          inline: true
        },
        {
          name: "Category",
          value: order.category || "Unknown",
          inline: true
        },
        {
          name: "Service",
          value: order.service || "Unknown",
          inline: true
        },
        {
          name: "Budget",
          value: order.budget || "Not Provided",
          inline: true
        }
      )
      .setTimestamp();

    // ─────────────────────────────
    // BUTTONS
    // ─────────────────────────────
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`claim_${order.orderId}`)
        .setLabel("Claim Order")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(`close_${order.orderId}`)
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: ownerRole ? `<@&${ownerRole.id}>` : "",
      embeds: [embed],
      components: [row]
    });

    console.log("✅ Ticket message sent");

    return channel;
  } catch (err) {
    console.log("❌ createTicket ERROR:", err);
  }
}

// ─────────────────────────────
// BUTTON HANDLERS
// ─────────────────────────────
export async function handleTicketButtons(i: Interaction) {
  if (!i.isButton()) return;

  const [action, orderId] = i.customId.split("_");

  if (action === "claim") {
    return i.reply({
      content: `📌 Order #${orderId} has been claimed by ${i.user}.`
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
