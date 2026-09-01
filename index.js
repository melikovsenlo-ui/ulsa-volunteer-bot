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

client.on("interactionCreate", async (interaction) => {

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

      const row = new ActionRowBuilder()
        .addComponents(answer);

      modal.addComponents(row);

      await interaction.showModal(modal);
      return;
    }

    if (interaction.customId === "accept") {

      await interaction.reply({
        content: "✅ Заявка отмечена как принятая."
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
        field => field.name === "👤 Discord заявителя"
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

client.once("ready", async () => {
  console.log(`Бот запущен: ${client.user.tag}`);

  const rulesChannel = await client.channels.fetch("1544128560598622279");

  if (!rulesChannel) {
    console.log("❌ Канал с правилами не найден");
    return;
  }

  // Проверяем, есть ли уже сообщение от бота с правилами
  const messages = await rulesChannel.messages.fetch({ limit: 20 });

  const alreadyPosted = messages.some(
    message =>
      message.author.id === client.user.id &&
      message.embeds.some(
        embed => embed.title === "ULSA VOLUNTEER CENTER"
      )
  );

  if (alreadyPosted) {
    console.log("📑 Правила уже опубликованы.");
    return;
  }

  const rules = [
    {
      title: "ULSA VOLUNTEER CENTER",
      description: `## ПРАВИЛА И ПОЛОЖЕНИЯ ДЛЯ ВОЛОНТЁРОВ

### 1. ОБЩИЕ ПОЛОЖЕНИЯ

ULSA Volunteer Center осуществляет координацию и организацию волонтёрской деятельности студентов в рамках университетского сообщества, общественных инициатив и проводимых мероприятий.

Участие в волонтёрской деятельности осуществляется на добровольной основе и предполагает соблюдение установленных требований, ответственное отношение к порученным обязанностям и уважительное отношение к другим участникам.

Вступление в состав ULSA Volunteer Center означает согласие волонтёра с настоящими правилами.

### 2. ОБЯЗАННОСТИ ВОЛОНТЁРА

Каждый волонтёр обязан:

• добросовестно выполнять возложенные на него обязанности;
• соблюдать установленное время начала мероприятий и назначений;
• выполнять законные указания руководителя Volunteer Center;
• соблюдать правила университета и места проведения мероприятия;
• поддерживать уважительное и профессиональное поведение;
• своевременно сообщать руководителю о невозможности выполнения поручения;
• незамедлительно сообщать о возникших проблемах, инцидентах и нарушениях;
• бережно относиться к имуществу университета и Volunteer Center.`
    },

    {
      title: "ULSA VOLUNTEER CENTER • ПРАВИЛА",
      description: `### 3. ПОВЕДЕНИЕ И ПРОФЕССИОНАЛЬНАЯ ЭТИКА

Волонтёр обязан соблюдать нормы уважительного поведения при взаимодействии со студентами, сотрудниками университета, посетителями мероприятий и другими волонтёрами.

Не допускаются:

• оскорбления и унижение других лиц;
• угрозы и агрессивное поведение;
• преследование и травля;
• дискриминация;
• намеренное нарушение порядка проведения мероприятий;
• действия, способные нанести ущерб репутации ULSA Volunteer Center;
• использование статуса волонтёра в личных целях.

Во время выполнения обязанностей волонтёр должен сохранять корректность и объективность.

### 4. АЛКОГОЛЬ, ТАБАК И ЗАПРЕЩЁННЫЕ ВЕЩЕСТВА

Запрещается принимать участие в волонтёрской деятельности в состоянии алкогольного или наркотического опьянения.

Во время выполнения волонтёрских обязанностей запрещается хранение, употребление или распространение запрещённых веществ.

Курение и использование табачных или никотиновых изделий допускается исключительно в местах, где это разрешено правилами соответствующей территории.`
    },

    {
      title: "ULSA VOLUNTEER CENTER • БЕЗОПАСНОСТЬ",
      description: `### 5. ТРЕБОВАНИЯ БЕЗОПАСНОСТИ

Безопасность участников мероприятий является приоритетной обязанностью каждого волонтёра.

Волонтёр обязан:

• соблюдать установленные правила безопасности;
• выполнять указания ответственных лиц;
• использовать оборудование только по назначению;
• не выполнять работу, для которой отсутствует необходимая подготовка или разрешение;
• незамедлительно сообщать об опасных ситуациях;
• сообщать ответственному лицу о полученных травмах и происшествиях.

В случае чрезвычайной ситуации волонтёр обязан обратиться в соответствующие экстренные службы и уведомить руководителя Volunteer Center.

### 6. КОНФИДЕНЦИАЛЬНОСТЬ

В процессе волонтёрской деятельности участнику может стать доступна личная или иная информация, не предназначенная для публичного распространения.

Распространение такой информации без соответствующего разрешения запрещается.

Персональные данные участников мероприятий и других лиц не могут использоваться в личных целях.`
    },

    {
      title: "ULSA VOLUNTEER CENTER • ИМУЩЕСТВО И УЧАСТИЕ",
      description: `### 7. ИМУЩЕСТВО И РЕСУРСЫ УНИВЕРСИТЕТА

Имущество, оборудование, помещения, документы и иные ресурсы университета и Volunteer Center должны использоваться исключительно в соответствии с их назначением.

Запрещаются умышленное повреждение, хищение, незаконное присвоение и неправомерное использование имущества.

### 8. ПОСЕЩЕНИЕ И УЧАСТИЕ В МЕРОПРИЯТИЯХ

Волонтёр обязан соблюдать принятые им обязательства при регистрации на мероприятие.

В случае невозможности присутствия необходимо уведомить руководителя или ответственного организатора в разумный срок.

Систематическое отсутствие без предварительного уведомления может повлечь ограничение возможности участия в последующих мероприятиях.`
    },

    {
      title: "ULSA VOLUNTEER CENTER • ПРЕДСТАВЛЕНИЕ",
      description: `### 9. ПРЕДСТАВЛЕНИЕ ULSA VOLUNTEER CENTER

Во время официальных мероприятий волонтёр представляет ULSA Volunteer Center.

Волонтёр не имеет права без соответствующего разрешения:

• делать официальные заявления от имени организации;
• принимать решения от имени руководства;
• давать обязательства от имени ULSA Volunteer Center;
• использовать название и символику организации в личных целях.

### 10. РАССМОТРЕНИЕ ЖАЛОБ И НАРУШЕНИЙ

Любой волонтёр вправе сообщить руководству о:

• нарушении настоящих правил;
• небезопасных условиях;
• случаях неуважительного поведения;
• дискриминации или преследовании;
• иных обстоятельствах, препятствующих нормальной работе Volunteer Center.

Обращения рассматриваются руководством Volunteer Center в установленном порядке.`
    },

    {
      title: "ULSA VOLUNTEER CENTER • ОТВЕТСТВЕННОСТЬ",
      description: `### 11. МЕРЫ ЗА НАРУШЕНИЕ ПРАВИЛ

В зависимости от характера и тяжести нарушения могут применяться следующие меры:

**I.** Устное или письменное предупреждение;

**II.** Временное ограничение участия в мероприятиях;

**III.** Отстранение от конкретного мероприятия;

**IV.** Лишение статуса волонтёра;

**V.** Передача информации соответствующим представителям университета в случаях, когда это необходимо.

### 12. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ

Каждый участник ULSA Volunteer Center обязан ознакомиться с настоящими правилами до начала волонтёрской деятельности.

Участие в деятельности Volunteer Center означает согласие соблюдать установленные требования и нести ответственность за свои действия в рамках предоставленных полномочий.

**ULSA Volunteer Center**
**Отдел волонтёрской деятельности**`
    }
  ];

for (const rule of rules) {
  const embed = new EmbedBuilder()
    .setTitle(rule.title)
    .setDescription(rule.description)
    .setImage("https://cdn.discordapp.com/attachments/1544128560598622279/1544132694290464808/image.png?ex=6a976522&is=6a9613a2&hm=859f5cc0dac4b28853834b9a862caf8385fa35ee5023c444aced4bfc255fb7e6&")
    .setFooter({
      text: "ULSA Volunteer Center • Volunteer Guidelines"
    })
    .setTimestamp();

  await rulesChannel.send({
    embeds: [embed]
  });
}
  console.log("📑 Все правила успешно опубликованы.");
});
client.once("ready", async () => {
  const channel = await client.channels.fetch("1544138828300820510");

  const embed = new EmbedBuilder()
    .setTitle("📝 КАК ВСТУПИТЬ В ULSA VOLUNTEER CENTER")
    .setDescription(`**ULSA Volunteer Center** открыт для студентов, желающих принимать участие в университетских, общественных и благотворительных мероприятиях.

### 01. ОЗНАКОМЬТЕСЬ С ПРАВИЛАМИ

Перед подачей заявки необходимо ознакомиться с **📜・правилами** Volunteer Center.

Подача заявки означает, что кандидат ознакомился с установленными требованиями и готов их соблюдать.

### 02. ЗАПОЛНИТЕ ЗАЯВКУ

Для вступления необходимо заполнить официальную заявку волонтёра.

В заявке потребуется указать основную информацию о себе, контактные данные, Discord username, курс/факультет, интересующие направления деятельности и доступное время.

**Форма заявки:**
https://tally.so/r/QKQrDk

### 03. ДОЖДИТЕСЬ РАССМОТРЕНИЯ

После отправки заявки она поступает на рассмотрение руководству **ULSA Volunteer Center**.

При необходимости с кандидатом могут связаться через Discord для уточнения предоставленной информации.

### 04. ПОЛУЧИТЕ РЕШЕНИЕ

После рассмотрения кандидат получает уведомление о результате.

✅ **Заявка одобрена** — кандидат принят в состав Volunteer Center.

⏳ **Требуется дополнительная информация** — необходимо уточнить отдельные данные.

❌ **Заявка отклонена** — кандидат не принят в состав Volunteer Center.

### 05. НАЧНИТЕ ВОЛОНТЁРСКУЮ ДЕЯТЕЛЬНОСТЬ

После принятия волонтёр получает соответствующую роль на сервере и может принимать участие в доступных мероприятиях и проектах.

Информация о новых мероприятиях публикуется в соответствующих каналах сервера.

### 💙 ВАЖНО

Волонтёрская деятельность осуществляется на **добровольной основе**. От участника ожидаются ответственность, соблюдение правил, уважительное отношение к другим участникам и готовность выполнять принятые на себя обязательства.

**🦫 Присоединяйтесь к ULSA Volunteer Center.**`)
    .setImage("https://cdn.discordapp.com/attachments/1544138828300820510/1544138865214759074/1788221749501-01a05a51-aa0e-771c-a6a9-98c739901b26.png?ex=6a976ae2&is=6a961962&hm=d2d69649eb9bf496b0b1d5b97e7762da5b30a456322d21a733ffcb9acd9ae450&")
    .setFooter({
      text: "ULSA Volunteer Center • Volunteer Recruitment"
    })
    .setTimestamp();

  await channel.send({
    embeds: [embed]
  });

  console.log("📝 Сообщение «Как вступить» отправлено.");
});
client.once("ready", async () => {
  const channel = await client.channels.fetch("1544138828300820510");

  const embed = new EmbedBuilder()
    .setTitle("📝 КАК ВСТУПИТЬ В ULSA VOLUNTEER CENTER")
    .setDescription(`**ULSA Volunteer Center** открыт для студентов, желающих принимать участие в университетских, общественных и благотворительных мероприятиях.

### 01. ОЗНАКОМЬТЕСЬ С ПРАВИЛАМИ

Перед подачей заявки необходимо ознакомиться с **📜・правилами** Volunteer Center.

Подача заявки означает, что кандидат ознакомился с установленными требованиями и готов их соблюдать.

### 02. ЗАПОЛНИТЕ ЗАЯВКУ

Для вступления необходимо заполнить официальную заявку волонтёра.

В заявке потребуется указать основную информацию о себе, контактные данные, Discord username, курс/факультет, интересующие направления деятельности и доступное время.

**Форма заявки:**
https://tally.so/r/QKQrDk

### 03. ДОЖДИТЕСЬ РАССМОТРЕНИЯ

После отправки заявки она поступает на рассмотрение руководству **ULSA Volunteer Center**.

При необходимости с кандидатом могут связаться через Discord для уточнения предоставленной информации.

### 04. ПОЛУЧИТЕ РЕШЕНИЕ

После рассмотрения кандидат получает уведомление о результате.

✅ **Заявка одобрена** — кандидат принят в состав Volunteer Center.

⏳ **Требуется дополнительная информация** — необходимо уточнить отдельные данные.

❌ **Заявка отклонена** — кандидат не принят в состав Volunteer Center.

### 05. НАЧНИТЕ ВОЛОНТЁРСКУЮ ДЕЯТЕЛЬНОСТЬ

После принятия волонтёр получает соответствующую роль на сервере и может принимать участие в доступных мероприятиях и проектах.

Информация о новых мероприятиях публикуется в соответствующих каналах сервера.

### 💙 ВАЖНО

Волонтёрская деятельность осуществляется на **добровольной основе**. От участника ожидаются ответственность, соблюдение правил, уважительное отношение к другим участникам и готовность выполнять принятые на себя обязательства.

**🦫 Присоединяйтесь к ULSA Volunteer Center.**`)
    .setImage("https://cdn.discordapp.com/attachments/1544138828300820510/1544138865214759074/1788221749501-01a05a51-aa0e-771c-a6a9-98c739901b26.png?ex=6a976ae2&is=6a961962&hm=d2d69649eb9bf496b0b1d5b97e7762da5b30a456322d21a733ffcb9acd9ae450&")
    .setFooter({
      text: "ULSA Volunteer Center • Volunteer Recruitment"
    })
    .setTimestamp();

  await channel.send({
    embeds: [embed]
  });

  console.log("📝 Сообщение «Как вступить» отправлено.");
});
 client.once("ready", async () => {
  console.log(`Бот запущен: ${client.user.tag}`);

  const infoChannel = await client.channels.fetch("1544138828300820510");

  if (!infoChannel) {
    console.log("❌ Канал «Как вступить» не найден.");
    return;
  }

  const infoEmbed = new EmbedBuilder()
    .setColor("#2774AE")
    .setTitle("📋 КАК ВСТУПИТЬ В ULSA VOLUNTEER CENTER")
    .setDescription(
      "**ULSA Volunteer Center** открыт для студентов, которые хотят принимать участие в общественной и волонтёрской деятельности университета.\n\n" +
      "### 🎓 Кто может вступить?\n" +
      "Участником может стать студент ULSA, готовый соблюдать правила Volunteer Center и ответственно выполнять возложенные обязанности.\n\n" +
      "### 📝 Как подать заявку?\n" +
      "1. Ознакомьтесь с правилами и положениями для волонтёров.\n" +
      "2. Заполните установленную заявку на вступление.\n" +
      "3. Укажите свои контактные данные, учебную информацию и доступность.\n" +
      "4. Дождитесь рассмотрения заявки руководством Volunteer Center.\n\n" +
      "### 🤝 После принятия\n" +
      "После одобрения заявки волонтёр получает соответствующую роль на сервере и может принимать участие в доступных волонтёрских мероприятиях и инициативах.\n\n" +
      "### ⚠️ Важно\n" +
      "Подавая заявку, вы подтверждаете, что ознакомились с правилами ULSA Volunteer Center и согласны их соблюдать."
    )
    .setImage("ВСТАВЬ_ССЫЛКУ_НА_ФОТО")
    .setFooter({
      text: "ULSA Volunteer Center • Volunteer Recruitment"
    })
    .setTimestamp();

  try {
    await infoChannel.send({
      embeds: [infoEmbed]
    });

    console.log("📋 Информация «Как вступить» отправлена.");
  } catch (error) {
    console.error("❌ Не удалось отправить информацию:", error);
  }
});
  console.log("📋 Информация отправлена.");
});
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `Сервер запущен на порту ${PORT}`
  );
});

client.login(DISCORD_TOKEN);
