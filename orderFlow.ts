import {
  ChatInputCommandInteraction,
  Interaction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} from "discord.js";

import { Order } from "./db";
import { createTicket } from "./ticket";
import { config } from "./config";

type Session = {
  step: "category" | "service" | "budget";
  category?: string;
  service?: string;
  budget?: string;
};

const sessions = new Map<string, Session>();
let orderCounter = 1000;

// ─────────────────────────────
// /ORDER
// ─────────────────────────────
export async function handleOrder(i: Interaction) {
  if (i.isChatInputCommand()) {
    const userId = i.user.id;

    sessions.set(userId, { step: "category" });

    const dm = await i.user.createDM();

    const embed = new EmbedBuilder()
      .setTitle("🛒 Premium Order System")
      .setDescription("Select a category to start your order.")
      .setColor(0x2b2d31);

    const menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("category")
        .addOptions([
          { label: "Discord Services", value: "discord" },
          { label: "GFX Design", value: "gfx" }
        ])
    );

    await dm.send({ embeds: [embed], components: [menu] });

    return i.reply({ content: "📩 Check your DMs", ephemeral: true });
  }

  if (!i.user) return;

  const session = sessions.get(i.user.id);
  if (!session) return;

  const dm = await i.user.createDM();

  // ───────── CATEGORY ─────────
  if (i.isStringSelectMenu() && i.customId === "category") {
    session.category = i.values[0];
    session.step = "service";

    const options =
      session.category === "discord"
        ? [
            { label: "Server Making", value: "server" },
            { label: "Bot Hosting", value: "hosting" },
            { label: "Custom Bots", value: "bots" }
          ]
        : [
            { label: "Thumbnails", value: "thumb" },
            { label: "Logos", value: "logo" }
          ];

    const embed = new EmbedBuilder()
      .setTitle("⚙ Service Selection")
      .setColor(0x2b2d31);

    const menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("service")
        .addOptions(options)
    );

    await dm.send({ embeds: [embed], components: [menu] });

    return i.reply({ content: "✔", ephemeral: true });
  }

  // ───────── SERVICE ─────────
  if (i.isStringSelectMenu() && i.customId === "service") {
    session.service = i.values[0];
    session.step = "budget";

    await dm.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("💰 Budget")
          .setDescription("Send your budget (min 50+ depending on service).")
          .setColor(0x2b2d31)
      ]
    });

    await i.reply({ content: "✔ Check DMs", ephemeral: true });

    const collector = dm.createMessageCollector({
      filter: (m) => m.author.id === i.user.id,
      max: 1,
      time: 120000
    });

    collector.on("collect", async (m) => {
      session.budget = m.content;

      const confirm = new EmbedBuilder()
        .setTitle("📋 Confirm Order")
        .setColor(0x2b2d31)
        .addFields(
          { name: "Category", value: session.category ?? "-" },
          { name: "Service", value: session.service ?? "-" },
          { name: "Budget", value: session.budget ?? "-" }
        );

      const btn = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("submit")
          .setLabel("Submit Order")
          .setStyle(ButtonStyle.Success)
      );

      await dm.send({ embeds: [confirm], components: [btn] });
    });
  }

  // ───────── SUBMIT ─────────
  if (i.isButton() && i.customId === "submit") {
    const userId = i.user.id;

    const session = sessions.get(userId);
    if (!session) return;

    const orderId = orderCounter++;

    const order = await Order.create({
      orderId,
      userId,
      category: session.category,
      service: session.service,
      budget: session.budget
    });

    await createTicket(i, order);

    sessions.delete(userId);

    return i.reply({
      content: `✅ Order #${orderId} created`,
      ephemeral: true
    });
  }
}
