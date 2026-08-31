const express = require("express");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require("discord.js");

const app = express();
app.use(express.json());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

// ==============================
// НАСТРОЙКИ
// ==============================

const CHANNEL_ID = process.env.CHANNEL_ID;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// ==============================
// DISCORD
// ==============================

client.once("ready", () => {
  console.log(`Бот запущен: ${client.user.tag}`);
});

// ==============================
// TALLY WEBHOOK
// ==============================

app.post("/tally", async (req, res) => {
  try {
    const data = req.body;

    const channel = await client.channels.fetch(CHANNEL_ID);

    if (!channel) {
      return res.status(500).send("Канал не найден");
    }

    const fields = data?.data?.fields || [];

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

      description += `**${name}:** ${value}\n`;
    }

    if (!description) {
      description = "Данные заявки не найдены.";
    }

    const embed = new EmbedBuilder()
      .setTitle("📩 Новая заявка — ULSA Volunteer Center")
      .setDescription(description)
      .setTimestamp()
      .setFooter({
        text: "ULSA Volunteer Center"
      });

    const message = await channel.send({
      embeds: [embed]
    });

    // Создаём отдельную ветку для обсуждения заявки
    await message.startThread({
      name: "Обсуждение заявки",
      autoArchiveDuration: 1440
    });

    res.status(200).send("OK");
  } catch (error) {
    console.error(error);
    res.status(500).send("Ошибка");
  }
});

// ==============================
// WEB SERVER
// ==============================

app.get("/", (req, res) => {
  res.send("ULSA Volunteer Bot работает!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Web server запущен на порту ${PORT}`);
});

client.login(DISCORD_TOKEN);
