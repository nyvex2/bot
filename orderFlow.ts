import {
  Interaction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import { Order } from "./db";
import { createTicket } from "./ticket";
import { services } from "./services";

// ─────────────────────────────
// SESSION TYPE
// ─────────────────────────────
type Session = {
  step: "category" | "service" | "budget";
  guildId: string;
  category?: string;
  service?: string;
  budget?: string;
};

const sessions = new Map<string, Session>();
let orderCounter = 1000;

// ─────────────────────────────
// MAIN HANDLER
// ─────────────────────────────
export async function handleOrder(i: Interaction) {
  try {
    // ───────── /ORDER COMMAND ─────────
    if (i.isChatInputCommand()) {
      const userId = i.user.id;

      if (!i.guildId) {
        return i.reply({
          content: "❌ Use this command inside a server.",
          flags: 64
        });
      }

      sessions.set(userId, {
        step: "category",
        guildId: i.guildId
      });

      const dm = await i.user.createDM();

      const embed = new EmbedBuilder()
        .setTitle("🛒 Premium Order System")
        .setDescription("Select a category to continue.")
        .setColor(0x2b2d31);

      const menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("category")
          .addOptions([
            { label: "💬 Discord Services", value: "discord" },
            { label: "🎨 GFX / Design", value: "gfx" },
            { label: "🌐 Website Development", value: "website" }
          ])
      );

      await dm.send({ embeds: [embed], components: [menu] });

      return i.reply({
        content: "📩 Check your DMs",
        flags: 64
      });
    }

    if (!i.user) return;

    const session = sessions.get(i.user.id);
    if (!session) return;

    const dm = await i.user.createDM();

    // ───────── CATEGORY SELECT ─────────
    if (i.isStringSelectMenu() && i.customId === "category") {
      session.category = i.values[0];
      session.step = "service";

      const selected = services[session.category as keyof typeof services];

      if (!selected) {
        return i.reply({
          content: "❌ Invalid category selected",
          flags: 64
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(`⚙ ${selected.label}`)
        .setDescription("Choose a service below:")
        .setColor(0x2b2d31);

      const menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("service")
          .addOptions(selected.options)
      );

      await dm.send({ embeds: [embed], components: [menu] });

      return i.reply({ content: "✔", flags: 64 });
    }

    // ───────── SERVICE SELECT ─────────
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

      await i.reply({ content: "✔", flags: 64 });

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

    // ───────── SUBMIT ORDER ─────────
    if (i.isButton() && i.customId === "submit") {
      const userId = i.user.id;

      const session = sessions.get(userId);
      if (!session) {
        return i.reply({
          content: "❌ Session expired. Run /order again.",
          flags: 64
        });
      }

      const orderId = orderCounter++;

      const order = await Order.create({
        orderId,
        userId,
        category: session.category,
        service: session.service,
        budget: session.budget
      });

      await createTicket(session.guildId, userId, order);

      sessions.delete(userId);

      return i.reply({
        content: `✅ Order #${orderId} created successfully`,
        flags: 64
      });
    }
  } catch (err) {
    console.log("❌ orderFlow error:", err);
  }
             }
