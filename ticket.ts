import {
  Interaction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} from "discord.js";

import { config } from "./config";

export async function createTicket(i: any, order: any) {
  const guild = i.guild;
  if (!guild) return;

  const channel = await guild.channels.create({
    name: `order-${order.orderId}`,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: order.userId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages
        ]
      }
    ]
  });

  const embed = new EmbedBuilder()
    .setTitle(`🧾 Order #${order.orderId}`)
    .setColor(0x00ff99)
    .addFields(
      { name: "User", value: `<@${order.userId}>` },
      { name: "Category", value: order.category },
      { name: "Service", value: order.service },
      { name: "Budget", value: order.budget }
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
    content: `@${config.ownerRoleName}`,
    embeds: [embed],
    components: [row]
  });
}

// ─────────────────────────────
// BUTTON HANDLERS
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
    await i.reply("🔒 Closing ticket...");
    setTimeout(() => i.channel?.delete().catch(() => {}), 3000);
  }
}
