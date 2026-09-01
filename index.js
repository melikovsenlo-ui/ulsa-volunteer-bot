const express = require("express");

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const app = express();
app.use(express.json());

// =====================================================
// DISCORD CLIENT
// =====================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// =====================================================
// ENV
// =====================================================

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// Канал, куда Tally отправляет заявки
const APPLICATIONS_CHANNEL_ID = process.env.CHANNEL_ID;

// Канал «Как вступить»
const JOIN_CHANNEL_ID = "1544138828300820510";

// Канал правил
const RULES_CHANNEL_ID = "1544128560598622279";

// =====================================================
// IMAGES
// =====================================================

const JOIN_IMAGE =
  "https://cdn.discordapp.com/attachments/1544134320120406057/1544138865214759074/1788221749501-01a05a51-aa0e-771c-a6a9-98c739901b26.png?ex=6a976ae2&is=6a961962&hm=d2d69649eb9bf496b0b1d5b97e7762da5b30a456322d21a733ffcb9acd9ae450&";

const RULES_IMAGE =
  "https://cdn.discordapp.com/attachments/1544128560598622279/1544132694290464808/image.png?ex=6a976522&is=6a9613a2&hm=859f5cc0dac4b28853834b9a862caf8385fa35ee5023c444aced4bfc255fb7e6&";

// =====================================================
// WEB SERVER
// =====================================================

app.get("/", (req, res) => {
  res.send("ULSA Volunteer Bot работает!");
});

// =====================================================
// TALLY WEBHOOK
// =====================================================

app.post("/tally", async (req, res) => {
  try {
    // Сразу отвечаем Tally
    res.status(200).send("OK");

    const payload = req.body;

    console.log("=================================");
    console.log("📩 НОВАЯ ЗАЯВКА TALLY");
    console.log("=================================");
    console.log(JSON.stringify(payload, null, 2));

    if (!APPLICATIONS_CHANNEL_ID) {
      console.error(
        "❌ CHANNEL_ID не установлен в переменных окружения."
      );
      return;
    }

    const channel = await client.channels.fetch(
      APPLICATIONS_CHANNEL_ID
    );

    if (!channel) {
      console.error(
        "❌ Канал заявок не найден."
      );
      return;
    }

    // =================================================
    // TALLY DATA
    // =================================================

    const data = payload?.data || {};

    const fields = Array.isArray(data.fields)
      ? data.fields
      : [];

    const submissionId =
      data.submissionId ||
      data.responseId ||
      "Не указан";

    const respondentId =
      data.respondentId ||
      "Не указан";

    const formName =
      data.formName ||
      "ULSA Volunteer Application";

    const previewUrl =
      data.submissionPreviewUrl || null;

    const pdfUrl =
      data.submissionPdfUrl || null;

    // =================================================
    // ANSWERS
    // =================================================

    let applicant = "Не указан";

    const answerLines = [];

    for (const field of fields) {
      const label =
        field.label ||
        field.key ||
        "Поле";

      let value = field.value;

      // -----------------------------
      // ARRAY
      // -----------------------------

      if (Array.isArray(value)) {
        value = value
          .map(item => {

            if (
              typeof item === "object" &&
              item !== null
            ) {
              return (
                item.text ||
                item.name ||
                item.label ||
                item.value ||
                item.url ||
                JSON.stringify(item)
              );
            }

            return String(item);
          })
          .join(", ");
      }

      // -----------------------------
      // OBJECT
      // -----------------------------

      if (
        typeof value === "object" &&
        value !== null
      ) {
        value = JSON.stringify(value);
      }

      // -----------------------------
      // EMPTY
      // -----------------------------

      if (
        value === null ||
        value === undefined ||
        value === ""
      ) {
        value = "Не указано";
      }

      const labelLower =
        String(label).toLowerCase();

      // =================================================
      // FIND DISCORD
      // =================================================

      if (
        labelLower.includes("discord") ||
        labelLower.includes("дискорд")
      ) {
        applicant = String(value);
      }

      answerLines.push(
        `**${label}:** ${value}`
      );
    }

    // =================================================
    // DESCRIPTION
    // =================================================

    let description =
      answerLines.join("\n\n");

    if (!description) {
      description =
        "Ответы заявки не найдены.";
    }

    // Discord limit
    if (description.length > 3900) {
      description =
        description.substring(0, 3900) +
        "\n\n…";
    }

    // =================================================
    // EMBED
    // =================================================

    const embed =
      new EmbedBuilder()
        .setColor("#2774AE")
        .setTitle(
          "📩 НОВАЯ ЗАЯВКА — ULSA VOLUNTEER CENTER"
        )
        .setDescription(description)
        .addFields(
          {
            name: "👤 Discord заявителя",
            value:
              String(applicant).substring(0, 1024)
          },
          {
            name: "🆔 ID заявки",
            value:
              String(submissionId).substring(0, 1024)
          },
          {
            name: "📋 Форма",
            value:
              String(formName).substring(0, 1024)
          },
          {
            name: "🔗 Respondent ID",
            value:
              String(respondentId).substring(0, 1024)
          }
        )
        .setFooter({
          text:
            "ULSA Volunteer Center • Application System"
        })
        .setTimestamp();

    // =================================================
    // BUTTONS
    // =================================================

    const rows = [];

    const mainRow =
      new ActionRowBuilder();

    // Открыть заявку
    if (previewUrl) {
      mainRow.addComponents(
        new ButtonBuilder()
          .setLabel("📄 Открыть заявку")
          .setStyle(ButtonStyle.Link)
          .setURL(previewUrl)
      );
    }

    // PDF
    if (pdfUrl) {
      mainRow.addComponents(
        new ButtonBuilder()
          .setLabel("📥 PDF")
          .setStyle(ButtonStyle.Link)
          .setURL(pdfUrl)
      );
    }

    // Если есть хотя бы одна ссылка
    if (mainRow.components.length > 0) {
      rows.push(mainRow);
    }

    // Кнопки обработки
    const actionRow =
      new ActionRowBuilder().addComponents(

        new ButtonBuilder()
          .setCustomId("reply")
          .setLabel("💬 Ответить")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("accept")
          .setLabel("✅ Принять")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("reject")
          .setLabel("❌ Отклонить")
          .setStyle(ButtonStyle.Danger)
      );

    rows.push(actionRow);

    // =================================================
    // SEND
    // =================================================

    await channel.send({
      embeds: [embed],
      components: rows
    });

    console.log(
      `✅ Заявка ${submissionId} отправлена в Discord.`
    );

  } catch (error) {

    console.error(
      "❌ Ошибка обработки Tally:",
      error
    );
  }
});

// =====================================================
// DISCORD INTERACTIONS
// =====================================================

client.on(
  "interactionCreate",
  async interaction => {

    // =================================================
    // BUTTONS
    // =================================================

    if (interaction.isButton()) {

      // ===============================================
      // REPLY
      // ===============================================

      if (interaction.customId === "reply") {

        const modal =
          new ModalBuilder()
            .setCustomId("reply_modal")
            .setTitle("Ответ заявителю");

        const answer =
          new TextInputBuilder()
            .setCustomId("answer")
            .setLabel("Ваш ответ")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder(
              "Введите ответ заявителю..."
            )
            .setRequired(true)
            .setMaxLength(2000);

        const row =
          new ActionRowBuilder()
            .addComponents(answer);

        modal.addComponents(row);

        await interaction.showModal(modal);

        return;
      }

      // ===============================================
      // ACCEPT
      // ===============================================

      if (interaction.customId === "accept") {

        await interaction.reply({
          content:
            "✅ Заявка отмечена как **принятая**."
        });

        return;
      }

      // ===============================================
      // REJECT
      // ===============================================

      if (interaction.customId === "reject") {

        await interaction.reply({
          content:
            "❌ Заявка отмечена как **отклонённая**."
        });

        return;
      }
    }

    // =================================================
    // MODAL
    // =================================================

    if (interaction.isModalSubmit()) {

      if (
        interaction.customId !==
        "reply_modal"
      ) {
        return;
      }

      const answer =
        interaction.fields.getTextInputValue(
          "answer"
        );

      const message =
        interaction.message;

      if (
        !message ||
        !message.embeds.length
      ) {

        await interaction.reply({
          content:
            "❌ Не удалось определить заявку.",
          ephemeral: true
        });

        return;
      }

      const embed =
        message.embeds[0];

      // ===============================================
      // DISCORD FIELD
      // ===============================================

      const discordField =
        embed.fields?.find(
          field =>
            field.name ===
            "👤 Discord заявителя"
        );

      if (!discordField) {

        await interaction.reply({
          content:
            "❌ В заявке не найден Discord username.",
          ephemeral: true
        });

        return;
      }

      let username =
        discordField.value
          .replace(/^@/, "")
          .trim();

      // ===============================================
      // GUILD
      // ===============================================

      const guild =
        interaction.guild;

      if (!guild) {

        await interaction.reply({
          content:
            "❌ Не удалось определить сервер.",
          ephemeral: true
        });

        return;
      }

      // ===============================================
      // FIND MEMBER
      // ===============================================

      try {

        const members =
          await guild.members.fetch();

        const cleanUsername =
          username
            .replace(/^@/, "")
            .trim()
            .toLowerCase();

        const member =
          members.find(member => {

            const currentUsername =
              member.user.username
                .toLowerCase();

            const globalName =
              (
                member.user.globalName ||
                ""
              ).toLowerCase();

            return (
              currentUsername ===
                cleanUsername ||
              globalName ===
                cleanUsername
            );
          });

        if (!member) {

          await interaction.reply({
            content:
              `❌ Пользователь **${username}** не найден на сервере ULSA.\n\n` +
              `Проверьте Discord username в заявке.`,
            ephemeral: true
          });

          return;
        }

        // =============================================
        // SEND DM
        // =============================================

        try {

          await member.send({
            content:
              `📩 **Ответ от ULSA Volunteer Center**\n\n${answer}`
          });

          await interaction.reply({
            content:
              `✅ Ответ отправлен пользователю **${member.user.username}** в личные сообщения.`
          });

        } catch (dmError) {

          console.error(
            "❌ Ошибка отправки ЛС:",
            dmError
          );

          await interaction.reply({
            content:
              `❌ Не удалось отправить ЛС пользователю **${member.user.username}**.\n` +
              `Возможно, у него закрыты личные сообщения.`,
            ephemeral: true
          });
        }

      } catch (error) {

        console.error(
          "❌ Ошибка поиска пользователя:",
          error
        );

        await interaction.reply({
          content:
            "❌ Произошла ошибка при поиске пользователя.",
          ephemeral: true
        });
      }
    }
  }
);

// =====================================================
// READY
// =====================================================

client.once(
  "clientReady",
  async () => {

    console.log(
      "================================="
    );

    console.log(
      `🦫 ULSA BOT ONLINE: ${client.user.tag}`
    );

    console.log(
      "================================="
    );

    console.log(
      `📩 Applications: ${APPLICATIONS_CHANNEL_ID}`
    );

    console.log(
      `📝 Join channel: ${JOIN_CHANNEL_ID}`
    );

    console.log(
      `📜 Rules channel: ${RULES_CHANNEL_ID}`
    );

    console.log(
      "ℹ️ Автоматическая публикация правил отключена."
    );

    console.log(
      "ℹ️ Автоматическая публикация «Как вступить» отключена."
    );
  }
);

// =====================================================
// DISCORD ERROR
// =====================================================

client.on(
  "error",
  error => {

    console.error(
      "❌ Discord client error:",
      error
    );
  }
);

// =====================================================
// PROCESS ERRORS
// =====================================================

process.on(
  "unhandledRejection",
  error => {

    console.error(
      "❌ Unhandled Promise Rejection:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  error => {

    console.error(
      "❌ Uncaught Exception:",
      error
    );
  }
);

// =====================================================
// WEB SERVER START
// =====================================================

const PORT =
  process.env.PORT || 3000;

app.listen(
  PORT,
  () => {

    console.log(
      `🌐 Web server запущен на порту ${PORT}`
    );
  }
);

// =====================================================
// LOGIN
// =====================================================

client.login(
  DISCORD_TOKEN
);
