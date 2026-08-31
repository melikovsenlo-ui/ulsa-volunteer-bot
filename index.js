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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

app.get("/", (req, res) => {
  res.send("ULSA Volunteer Bot работает!");
});

app.post("/tally", async (req, res) => {
  try {
    const data = req.body;
    const channel = await client.channels.fetch(CHANNEL_ID);

    if (!channel) {
      return res.status(500).send("Канал не найден");
    }

    const fields = data?.data?.fields || [];

    let applicant = "Не указан";
    let description = "";

    for (const field of fields) {
      const name = field.label || field.key || "Поле";

      let value = field.value;

      if (Array.isArray(value)) {
        value = value.join(", ");
      }

      if (
        value === null ||
        value === undefined ||
        value === ""
      ) {
        value = "Не указано";
      }

      if (name.toLowerCase().includes("discord")) {
        applicant = String(value);
      }

      description += `**${name}:** ${value}\n`;
    }

    if (!description) {
      description = "Данные заявки не найдены.";
    }

    const embed = new EmbedBuilder()
      .setTitle("📩 Новая заявка — ULSA Volunteer Center")
      .setDescription(description)
      .addFields({
        name: "👤 Discord заявителя",
        value: applicant
      })
      .setTimestamp()
      .setFooter({
        text: "ULSA Volunteer Center"
      });

    const buttons = new ActionRowBuilder().addComponents(
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

    await channel.send({
      embeds: [embed],
      components: [buttons]
    });

    res.status(200).send("OK");

  } catch (error) {
    console.error(error);
    res.status(500).send("Ошибка");
  }
});
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (!message.channel.isDMBased()) return;

  console.log(
    `📩 Получено ЛС от ${message.author.username}: ${message.content}`
  );

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);

    if (!channel) {
      console.log("❌ Канал заявок не найден");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("💬 Ответ от заявителя")
      .setDescription(
        `**👤 Пользователь:** ${message.author.username}\n\n` +
        `**Сообщение:**\n${message.content || "(сообщение без текста)"}`
      )
      .setTimestamp()
      .setFooter({
        text: "ULSA Volunteer Center"
      });

    await channel.send({
      embeds: [embed]
    });

    console.log(
      `✅ Ответ ${message.author.username} отправлен в канал заявок`
    );

  } catch (error) {
    console.error("❌ Ошибка обработки ЛС:", error);
  }
});

    await channel.send({
      embeds: [embed]
    });

  } catch (error) {
    console.error("Ошибка обработки ЛС:", error);
  }
});
client.on("interactionCreate", async (interaction) => {
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.channel.isDMBased()) return;

  console.log(
    `📩 Получено ЛС от ${message.author.username}: ${message.content}`
  );

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);

    if (!channel) {
      console.log("❌ Канал заявок не найден");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("💬 Ответ от заявителя")
      .setDescription(
        `**👤 Пользователь:** ${message.author.username}\n\n` +
        `**Сообщение:**\n${message.content || "(сообщение без текста)"}`
      )
      .setTimestamp()
      .setFooter({
        text: "ULSA Volunteer Center"
      });

    await channel.send({
      embeds: [embed]
    });

    console.log(
      `✅ Ответ ${message.author.username} отправлен в канал заявок`
    );

  } catch (error) {
    console.error("❌ Ошибка обработки ЛС:", error);
  }
});

      return;
    }

    if (interaction.customId === "reject") {

      await interaction.reply({
        content: "❌ Заявка отмечена как отклонённая."
      });

      return;
    }
  }

  if (interaction.isModalSubmit()) {

    if (interaction.customId === "reply_modal") {

      const answer =
        interaction.fields.getTextInputValue("answer");

      const message = interaction.message;

      if (!message || !message.embeds.length) {

        await interaction.reply({
          content: "❌ Не удалось определить заявку.",
          ephemeral: true
        });

        return;
      }

      const embed = message.embeds[0];

      const discordField = embed.fields?.find(
        field =>
          field.name === "👤 Discord заявителя"
      );

      if (!discordField) {

        await interaction.reply({
          content:
            "❌ В заявке не найден Discord username.",
          ephemeral: true
        });

        return;
      }

      const username = discordField.value
        .replace("@", "")
        .trim();

      const guild = interaction.guild;

      if (!guild) {

        await interaction.reply({
          content: "❌ Не удалось определить сервер.",
          ephemeral: true
        });

        return;
      }

      try {

        const members = await guild.members.fetch();

        const member = members.find(
          member =>
            member.user.username.toLowerCase() ===
            username.toLowerCase()
        );

        if (!member) {

          await interaction.reply({
            content:
              `❌ Пользователь **${username}** не найден на сервере ULSA.\n\n` +
              `Проверьте правильность Discord username.`,
            ephemeral: true
          });

          return;
        }

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

          await interaction.reply({
            content:
              `❌ Не удалось отправить ЛС пользователю **${member.user.username}**.\n` +
              `Возможно, у него закрыты личные сообщения.`,
            ephemeral: true
          });
        }

      } catch (error) {

        console.error(error);

        await interaction.reply({
          content:
            "❌ Произошла ошибка при поиске пользователя.",
          ephemeral: true
        });
      }

      return;
    }
  }
});

client.once("ready", () => {
  console.log(
    `Бот запущен: ${client.user.tag}`
  );
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `Сервер запущен на порту ${PORT}`
  );
});

client.login(DISCORD_TOKEN);
