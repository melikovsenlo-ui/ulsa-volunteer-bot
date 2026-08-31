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

      if (value === null || value === undefined || value === "") {
        value = "Не указано";
      }

      if (
        name.toLowerCase().includes("discord")
      ) {
        applicant = String(value);
      }

      description += `**${name}:** ${value}\n`;
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

    const row = new ActionRowBuilder().addComponents(
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
      components: [row]
    });

    res.status(200).send("OK");

  } catch (error) {
    console.error(error);
    res.status(500).send("Ошибка");
  }
});

client.on("interactionCreate", async (interaction) => {

  if (!interaction.isButton() && !interaction.isModalSubmit()) {
    return;
  }

  if (interaction.isButton()) {

    if (interaction.customId === "reply") {

      const modal = new ModalBuilder()
        .setCustomId("reply_modal")
        .setTitle("Ответ заявителю");

      const answer = new TextInputBuilder()
        .setCustomId("answer")
        .setLabel("Ваш ответ")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Введите ответ заявителю...")
        .setRequired(true)
        .setMaxLength(2000);

      const row = new ActionRowBuilder().addComponents(answer);

      modal.addComponents(row);

      await interaction.showModal(modal);
      return;
    }

    if (interaction.customId === "accept") {

      await interaction.reply({
        content: "✅ Заявка отмечена как **принятая**.",
        ephemeral: false
      });

      return;
    }

    if (interaction.customId === "reject") {

      await interaction.reply({
        content: "❌ Заявка отмечена как **отклонённая**.",
        ephemeral: false
      });

      return;
    }
  }

  if (interaction.isModalSubmit()) {

  if (interaction.customId === "reply_modal") {

    const answer = interaction.fields.getTextInputValue("answer");

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
      field => field.name === "👤 Discord заявителя"
    );

    if (!discordField) {
      await interaction.reply({
        content: "❌ В заявке не найден Discord username.",
        ephemeral: true
      });
      return;
    }

    const username = discordField.value
      .replace("@", "")
      .trim();

    const guild = interaction.guild;

    const members = await guild.members.fetch();

    const member = members.find(
      m => m.user.username.toLowerCase() === username.toLowerCase()
    );

    if (!member) {
      await interaction.reply({
        content:
          `❌ Пользователь **${username}** не найден на сервере ULSA.\n\n` +
          `Проверьте, что он находится на сервере и указал правильный Discord username.`,
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
          `✅ Ответ успешно отправлен пользователю **${member.user.username}** в личные сообщения.`,
        ephemeral: false
      });

    } catch (error) {

      await interaction.reply({
        content:
          `❌ Не удалось отправить ЛС пользователю **${member.user.username}**.\n` +
          `Возможно, у него закрыты личные сообщения от участников сервера.`,
        ephemeral: true
      });

    }

    return;
  }
}
client.once("ready", () => {
  console.log(`Бот запущен: ${client.user.tag}`);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

client.login(DISCORD_TOKEN);
