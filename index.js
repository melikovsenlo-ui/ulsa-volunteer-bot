```js
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
  TextInputStyle,
  PermissionsBitField
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

// =====================================================
// НАСТРОЙКИ КАНАЛОВ
// =====================================================

// Канал, куда приходят заявки Tally
const APPLICATIONS_CHANNEL_ID = process.env.CHANNEL_ID;

// Канал «Как вступить»
const JOIN_CHANNEL_ID = "1544138828300820510";

// Канал с правилами
const RULES_CHANNEL_ID = "1544128560598622279";

// =====================================================
// НАСТРОЙКИ
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
    // Сначала сразу отвечаем Tally,
    // чтобы webhook не получил timeout.
    res.status(200).send("OK");

    const payload = req.body;

    console.log("📩 Получена новая заявка Tally:");
    console.log(JSON.stringify(payload, null, 2));

    const channel = await client.channels.fetch(
      APPLICATIONS_CHANNEL_ID
    );

    if (!channel) {
      console.error("❌ Канал заявок не найден.");
      return;
    }

    // -------------------------------------------------
    // Данные заявки
    // -------------------------------------------------

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

    // -------------------------------------------------
    // Получаем ответы
    // -------------------------------------------------

    let applicant = "Не указан";

    const answerLines = [];

    for (const field of fields) {

      const label =
        field.label ||
        field.key ||
        "Поле";

      let value = field.value;

      // Массивы
      if (Array.isArray(value)) {

        // Multiple choice / checkboxes
        if (
          field.options &&
          Array.isArray(field.options)
        ) {

          value = value
            .map(id => {

              const option =
                field.options.find(
                  option => option.id === id
                );

              return option
                ? option.text
                : id;

            })
            .join(", ");

        } else {

          // Обычный массив
          value = value
            .map(item => {

              if (
                typeof item === "object" &&
                item !== null
              ) {

                return (
                  item.name ||
                  item.text ||
                  item.url ||
                  JSON.stringify(item)
                );

              }

              return String(item);

            })
            .join(", ");
        }
      }

      // Объекты
      if (
        typeof value === "object" &&
        value !== null
      ) {

        value = JSON.stringify(value);
      }

      // Пустые значения
      if (
        value === null ||
        value === undefined ||
        value === ""
      ) {

        value = "Не указано";
      }

      const labelLower =
        String(label).toLowerCase();

      // -------------------------------------------------
      // Поиск Discord
      // -------------------------------------------------

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

    // -------------------------------------------------
    // Если Discord не найден
    // -------------------------------------------------

    if (applicant === "Не указан") {

      // Попробуем найти значение среди полей
      // по ключу
      for (const field of fields) {

        const key =
          String(field.key || "").toLowerCase();

        if (key.includes("discord")) {

          applicant =
            String(field.value || "Не указан");

          break;
        }
      }
    }

    // -------------------------------------------------
    // Ограничение Discord Embed
    // -------------------------------------------------

    let description =
      answerLines.join("\n\n");

    if (!description) {

      description =
        "Ответы заявки не найдены.";
    }

    // Discord Embed description максимум 4096 символов
    if (description.length > 3900) {

      description =
        description.substring(0, 3900) +
        "\n\n…";
    }

    // -------------------------------------------------
    // Основной Embed
    // -------------------------------------------------

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
            value: applicant.substring(0, 1024)
          },
          {
            name: "🆔 ID заявки",
            value: String(submissionId)
              .substring(0, 1024)
          },
          {
            name: "📋 Форма",
            value: String(formName)
              .substring(0, 1024)
          }
        )
        .setFooter({
          text:
            "ULSA Volunteer Center • Application System"
        })
        .setTimestamp();

    // -------------------------------------------------
    // Кнопки
    // -------------------------------------------------

    const buttons =
      new ActionRowBuilder();

    if (previewUrl) {

      buttons.addComponents(
        new ButtonBuilder()
          .setLabel("📄 Открыть заявку")
          .setStyle(ButtonStyle.Link)
          .setURL(previewUrl)
      );
    }

    if (pdfUrl) {

      buttons.addComponents(
        new ButtonBuilder()
          .setLabel("📥 PDF")
          .setStyle(ButtonStyle.Link)
          .setURL(pdfUrl)
      );
    }

    buttons.addComponents(
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

    // -------------------------------------------------
    // Отправляем заявку
    // -------------------------------------------------

    await channel.send({
      embeds: [embed],
      components: [buttons]
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

      // -------------------------------------------------
      // Ответить
      // -------------------------------------------------

      if (
        interaction.customId === "reply"
      ) {

        const modal =
          new ModalBuilder()
            .setCustomId("reply_modal")
            .setTitle("Ответ заявителю");

        const answer =
          new TextInputBuilder()
            .setCustomId("answer")
            .setLabel("Ваш ответ")
            .setStyle(
              TextInputStyle.Paragraph
            )
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

      // -------------------------------------------------
      // Принять
      // -------------------------------------------------

      if (
        interaction.customId === "accept"
      ) {

        await interaction.reply({
          content:
            "✅ Заявка отмечена как **принятая**."
        });

        return;
      }

      // -------------------------------------------------
      // Отклонить
      // -------------------------------------------------

      if (
        interaction.customId === "reject"
      ) {

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

    if (
      interaction.isModalSubmit()
    ) {

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

      // -------------------------------------------------
      // Находим Discord пользователя
      // -------------------------------------------------

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

      const username =
        discordField.value
          .replace(/^@/, "")
          .trim();

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

      // -------------------------------------------------
      // Ищем пользователя
      // -------------------------------------------------

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

        // -------------------------------------------------
        // Отправляем ЛС
        // -------------------------------------------------

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
            "Ошибка отправки ЛС:",
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
          "Ошибка поиска пользователя:",
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
      `🦫 Бот запущен: ${client.user.tag}`
    );

    // =================================================
    // КАНАЛ «КАК ВСТУПИТЬ»
    // =================================================

    try {

      const joinChannel =
        await client.channels.fetch(
          JOIN_CHANNEL_ID
        );

      if (!joinChannel) {

        console.log(
          "❌ Канал «Как вступить» не найден."
        );

      } else {

        const messages =
          await joinChannel.messages.fetch({
            limit: 50
          });

        const alreadyPosted =
          messages.some(
            message =>
              message.author.id ===
                client.user.id &&
              message.embeds.some(
                embed =>
                  embed.title ===
                  "📝 КАК ВСТУПИТЬ В ULSA VOLUNTEER CENTER"
              )
          );

        if (!alreadyPosted) {

          const joinEmbed =
            new EmbedBuilder()
              .setColor("#2774AE")
              .setTitle(
                "📝 КАК ВСТУПИТЬ В ULSA VOLUNTEER CENTER"
              )
              .setDescription(
                "**ULSA Volunteer Center** открыт для студентов, желающих принимать участие в университетских, общественных и благотворительных мероприятиях.\n\n" +

                "### 01. ОЗНАКОМЬТЕСЬ С ПРАВИЛАМИ\n\n" +

                "Перед подачей заявки необходимо ознакомиться с правилами Volunteer Center.\n\n" +

                "### 02. ЗАПОЛНИТЕ ЗАЯВКУ\n\n" +

                "Для вступления необходимо заполнить официальную заявку волонтёра.\n\n" +

                "**Форма заявки:**\n" +
                "https://tally.so/r/QKQrDk\n\n" +

                "### 03. ДОЖДИТЕСЬ РАССМОТРЕНИЯ\n\n" +

                "После отправки заявки она поступает на рассмотрение руководству ULSA Volunteer Center.\n\n" +

                "### 04. ПОЛУЧИТЕ РЕШЕНИЕ\n\n" +

                "После рассмотрения кандидат получает уведомление о результате.\n\n" +

                "✅ **Заявка одобрена** — кандидат принят в состав Volunteer Center.\n\n" +

                "⏳ **Требуется дополнительная информация** — необходимо уточнить отдельные данные.\n\n" +

                "❌ **Заявка отклонена** — кандидат не принят в состав Volunteer Center.\n\n" +

                "### 05. НАЧНИТЕ ВОЛОНТЁРСКУЮ ДЕЯТЕЛЬНОСТЬ\n\n" +

                "После принятия волонтёр получает соответствующую роль на сервере и может принимать участие в доступных мероприятиях и проектах.\n\n" +

                "### 💙 ВАЖНО\n\n" +

                "Волонтёрская деятельность осуществляется на **добровольной основе**. От участника ожидаются ответственность, соблюдение правил и уважительное отношение к другим участникам.\n\n" +

                "**🦫 Присоединяйтесь к ULSA Volunteer Center.**"
              )
              .setImage(JOIN_IMAGE)
              .setFooter({
                text:
                  "ULSA Volunteer Center • Volunteer Recruitment"
              })
              .setTimestamp();

          await joinChannel.send({
            embeds: [joinEmbed]
          });

          console.log(
            "📝 Сообщение «Как вступить» опубликовано."
          );

        } else {

          console.log(
            "📝 «Как вступить» уже опубликовано."
          );
        }
      }

    } catch (error) {

      console.error(
        "❌ Ошибка канала «Как вступить»:",
        error
      );
    }

    // =================================================
    // КАНАЛ ПРАВИЛ
    // =================================================

    try {

      const rulesChannel =
        await client.channels.fetch(
          RULES_CHANNEL_ID
        );

      if (!rulesChannel) {

        console.log(
          "❌ Канал правил не найден."
        );

      } else {

        const messages =
          await rulesChannel.messages.fetch({
            limit: 50
          });

        const alreadyPosted =
          messages.some(
            message =>
              message.author.id ===
                client.user.id &&
              message.embeds.some(
                embed =>
                  embed.title ===
                  "ULSA VOLUNTEER CENTER"
              )
          );

        if (
          alreadyPosted
        ) {

          console.log(
            "📑 Правила уже опубликованы."
          );

        } else {

          const rules = [

            {
              title:
                "ULSA VOLUNTEER CENTER",

              description:
`## ПРАВИЛА И ПОЛОЖЕНИЯ ДЛЯ ВОЛОНТЁРОВ

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
              title:
                "ULSA VOLUNTEER CENTER • ПРАВИЛА",

              description:
`### 3. ПОВЕДЕНИЕ И ПРОФЕССИОНАЛЬНАЯ ЭТИКА

Волонтёр обязан соблюдать нормы уважительного поведения при взаимодействии со студентами, сотрудниками университета, посетителями мероприятий и другими волонтёрами.

Не допускаются:

• оскорбления и унижение других лиц;
• угрозы и агрессивное поведение;
• преследование и травля;
• дискриминация;
• намеренное нарушение порядка проведения мероприятий;
• действия, способные нанести ущерб репутации ULSA Volunteer Center;
• использование статуса волонтёра в личных целях.

### 4. АЛКОГОЛЬ, ТАБАК И ЗАПРЕЩЁННЫЕ ВЕЩЕСТВА

Запрещается принимать участие в волонтёрской деятельности в состоянии алкогольного или наркотического опьянения.

Во время выполнения волонтёрских обязанностей запрещается хранение, употребление или распространение запрещённых веществ.

Курение и использование табачных или никотиновых изделий допускается исключительно в местах, где это разрешено правилами соответствующей территории.`
            },

            {
              title:
                "ULSA VOLUNTEER CENTER • БЕЗОПАСНОСТЬ",

              description:
`### 5. ТРЕБОВАНИЯ БЕЗОПАСНОСТИ

Безопасность участников мероприятий является приоритетной обязанностью каждого волонтёра.

Волонтёр обязан:

• соблюдать установленные правила безопасности;
• выполнять указания ответственных лиц;
• использовать оборудование только по назначению;
• не выполнять работу, для которой отсутствует необходимая подготовка или разрешение;
• незамедлительно сообщать об опасных ситуациях;
• сообщать ответственному лицу о полученных травмах и происшествиях.

### 6. КОНФИДЕНЦИАЛЬНОСТЬ

В процессе волонтёрской деятельности участнику может стать доступна личная или иная информация, не предназначенная для публичного распространения.

Распространение такой информации без соответствующего разрешения запрещается.

Персональные данные участников мероприятий и других лиц не могут использоваться в личных целях.`
            },

            {
              title:
                "ULSA VOLUNTEER CENTER • ИМУЩЕСТВО И УЧАСТИЕ",

              description:
`### 7. ИМУЩЕСТВО И РЕСУРСЫ УНИВЕРСИТЕТА

Имущество, оборудование, помещения, документы и иные ресурсы университета и Volunteer Center должны использоваться исключительно в соответствии с их назначением.

Запрещаются умышленное повреждение, хищение, незаконное присвоение и неправомерное использование имущества.

### 8. ПОСЕЩЕНИЕ И УЧАСТИЕ В МЕРОПРИЯТИЯХ

Волонтёр обязан соблюдать принятые им обязательства при регистрации на мероприятие.

В случае невозможности присутствия необходимо уведомить руководителя или ответственного организатора в разумный срок.

Систематическое отсутствие без предварительного уведомления может повлечь ограничение возможности участия в последующих мероприятиях.`
            },

            {
              title:
                "ULSA VOLUNTEER CENTER • ПРЕДСТАВЛЕНИЕ",

              description:
`### 9. ПРЕДСТАВЛЕНИЕ ULSA VOLUNTEER CENTER

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
              title:
                "ULSA VOLUNTEER CENTER • ОТВЕТСТВЕННОСТЬ",

              description:
`### 11. МЕРЫ ЗА НАРУШЕНИЕ ПРАВИЛ

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

          for (
            const rule of rules
          ) {

            const embed =
              new EmbedBuilder()
                .setColor("#2774AE")
                .setTitle(rule.title)
                .setDescription(
                  rule.description
                )
                .setImage(
                  RULES_IMAGE
                )
                .setFooter({
                  text:
                    "ULSA Volunteer Center • Volunteer Guidelines"
                })
                .setTimestamp();

            await rulesChannel.send({
              embeds: [embed]
            });
          }

          console.log(
            "📑 Все правила опубликованы."
          );
        }
      }

    } catch (error) {

      console.error(
        "❌ Ошибка публикации правил:",
        error
      );
    }
  }
);

// =====================================================
// ERROR HANDLING
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
// START
// =====================================================

const PORT =
  process.env.PORT || 3000;

app.listen(
  PORT,
  () => {

    console.log(
      `🌐 Сервер запущен на порту ${PORT}`
    );
  }
);

client.login(
  DISCORD_TOKEN
);
```
