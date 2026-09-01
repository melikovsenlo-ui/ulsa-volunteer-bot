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
// ENVIRONMENT
// =====================================================

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

// =====================================================
// НАСТРОЙКИ ULSA
// =====================================================

const GUEST_ROLE_ID = "1544145435755683882";
const VOLUNTEER_ROLE_ID = "1544127357487550587";

const INFO_CHANNEL_ID = "1544134320120406057";
const RULES_CHANNEL_ID = "1544128560598622279";
const JOIN_CHANNEL_ID = "1544138828300820510";

// =====================================================
// ИЗОБРАЖЕНИЯ
// =====================================================

const JOIN_IMAGE =
  "https://cdn.discordapp.com/attachments/1544134320120406057/1544138865214759074/1788221749501-01a05a51-aa0e-771c-a6a9-98c739901b26.png?ex=6a976ae2&is=6a961962&hm=d2d69649eb9bf496b0b1d5b97e7762da5b30a456322d21a733ffcb9acd9ae450&";

const RULES_IMAGE =
  "https://cdn.discordapp.com/attachments/1544134320120406057/1544136397751976087/1788220793888-01a05a43-226f-7898-9b9d-c4ccc917fb67.png?ex=6a976895&is=6a961715&hm=4eb8a4f6aabcf3fc5ff79ede94dd841d9c1776d1c8da6b0374569a90e3ed26f8&";

// =====================================================
// WEB SERVER
// =====================================================

app.get("/", (req, res) => {
  res.send("ULSA Volunteer Bot работает!");
});

// =====================================================
// TALLY — ПОЛУЧЕНИЕ ЗАЯВКИ
// =====================================================

app.post("/tally", async (req, res) => {
  try {
    const data = req.body;

    console.log("📩 Получена новая заявка Tally.");

    const channel = await client.channels.fetch(CHANNEL_ID);

    if (!channel) {
      console.log("❌ Канал заявок не найден.");
      return res.status(500).send("Канал не найден");
    }

    const fields = data?.data?.fields || [];

    let applicant = "Не указан";
    let description = "";

    for (const field of fields) {
      const name = String(field.label || field.key || "Поле");

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

      value = String(value);

      // Ищем Discord username
      if (name.toLowerCase().includes("discord")) {
        applicant = value;
      }

      // ВАЖНО:
      // Здесь используются обычные обратные кавычки JavaScript.
      description += `**${name}:** ${value}\n`;
    }

    if (!description) {
      description = "Данные заявки не найдены.";
    }

    // Discord Embed description максимум 4096 символов
    if (description.length > 4000) {
      description =
        description.substring(0, 3900) +
        "\n\n…данные сокращены.";
    }

    const embed = new EmbedBuilder()
      .setColor("#2774AE")
      .setTitle("📩 Новая заявка — ULSA Volunteer Center")
      .setDescription(description)
      .addFields({
        name: "👤 Discord заявителя",
        value: applicant.substring(0, 1024)
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

    console.log("✅ Заявка отправлена в Discord.");

    res.status(200).send("OK");

  } catch (error) {
    console.error("❌ Ошибка Tally:", error);

    res.status(500).send("Ошибка");
  }
});

// =====================================================
// ПОИСК ПОЛЬЗОВАТЕЛЯ
// =====================================================

async function findMember(guild, username) {
  try {
    const cleanUsername = String(username)
      .replace(/^@/, "")
      .trim();

    const members = await guild.members.fetch();

    const member = members.find(member => {
      const currentUsername =
        member.user.username.toLowerCase();

      const globalName =
        member.user.globalName
          ? member.user.globalName.toLowerCase()
          : "";

      const tag =
        member.user.tag
          ? member.user.tag.toLowerCase()
          : "";

      const search =
        cleanUsername.toLowerCase();

      return (
        currentUsername === search ||
        globalName === search ||
        tag === search
      );
    });

    return member || null;

  } catch (error) {
    console.error(
      "❌ Ошибка поиска участника:",
      error
    );

    return null;
  }
}

// =====================================================
// DISCORD INTERACTIONS
// =====================================================

client.on("interactionCreate", async (interaction) => {

  // ===================================================
  // КНОПКИ
  // ===================================================

  if (interaction.isButton()) {

    // =================================================
    // ОТВЕТИТЬ
    // =================================================

    if (interaction.customId === "reply") {

      const modal = new ModalBuilder()
        .setCustomId("reply_modal")
        .setTitle("Ответ заявителю");

      const answer = new TextInputBuilder()
        .setCustomId("answer")
        .setLabel("Ваш ответ")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder(
          "Введите ответ заявителю..."
        )
        .setRequired(true)
        .setMaxLength(2000);

      const row = new ActionRowBuilder()
        .addComponents(answer);

      modal.addComponents(row);

      await interaction.showModal(modal);

      return;
    }

    // =================================================
    // ПРИНЯТЬ
    // =================================================

    if (interaction.customId === "accept") {

      await interaction.deferReply();

      try {

        const message = interaction.message;

        if (
          !message ||
          !message.embeds ||
          !message.embeds.length
        ) {
          await interaction.editReply(
            "❌ Не удалось определить заявку."
          );

          return;
        }

        const embed = message.embeds[0];

        const discordField =
          embed.fields?.find(
            field =>
              field.name ===
              "👤 Discord заявителя"
          );

        if (!discordField) {

          await interaction.editReply(
            "❌ В заявке не найден Discord username."
          );

          return;
        }

        const username =
          discordField.value
            .replace(/^@/, "")
            .trim();

        const guild = interaction.guild;

        if (!guild) {

          await interaction.editReply(
            "❌ Не удалось определить сервер."
          );

          return;
        }

        console.log(
          `🔎 Ищем пользователя: ${username}`
        );

        const member =
          await findMember(
            guild,
            username
          );

        if (!member) {

          await interaction.editReply(
            `❌ Пользователь **${username}** не найден на сервере.\n\n` +
            "Проверь, что в Tally указан правильный Discord username."
          );

          return;
        }

        // =================================================
        // РОЛИ
        // =================================================

        const guestRole =
          guild.roles.cache.get(
            GUEST_ROLE_ID
          );

        const volunteerRole =
          guild.roles.cache.get(
            VOLUNTEER_ROLE_ID
          );

        if (!guestRole) {

          await interaction.editReply(
            "❌ Роль **Guest** не найдена.\n\n" +
            `ID: ${GUEST_ROLE_ID}`
          );

          return;
        }

        if (!volunteerRole) {

          await interaction.editReply(
            "❌ Роль **Volunteer** не найдена.\n\n" +
            `ID: ${VOLUNTEER_ROLE_ID}`
          );

          return;
        }

        // =================================================
        // ПРАВА БОТА
        // =================================================

        const botMember =
          guild.members.me;

        if (!botMember) {

          await interaction.editReply(
            "❌ Не удалось определить бота на сервере."
          );

          return;
        }

        if (
          !botMember.permissions.has(
            PermissionsBitField.Flags.ManageRoles
          )
        ) {

          await interaction.editReply(
            "❌ У бота нет права **Управление ролями**."
          );

          return;
        }

        // =================================================
        // ПРОВЕРКА ИЕРАРХИИ
        // =================================================

        if (
          volunteerRole.position >=
          botMember.roles.highest.position
        ) {

          await interaction.editReply(
            "❌ Бот не может выдать роль **Volunteer**.\n\n" +
            "Перемести роль бота выше роли **Volunteer** в настройках сервера Discord."
          );

          return;
        }

        // =================================================
        // ВЫДАЁМ VOLUNTEER
        // =================================================

        await member.roles.add(
          volunteerRole,
          "Заявка ULSA Volunteer Center одобрена"
        );

        console.log(
          `✅ Роль Volunteer выдана ${member.user.tag}`
        );

        // =================================================
        // УБИРАЕМ GUEST
        // =================================================

        if (
          member.roles.cache.has(
            GUEST_ROLE_ID
          )
        ) {

          if (
            guestRole.position <
            botMember.roles.highest.position
          ) {

            await member.roles.remove(
              guestRole,
              "Пользователь принят в ULSA Volunteer Center"
            );

            console.log(
              `✅ Роль Guest снята с ${member.user.tag}`
            );

          } else {

            console.log(
              "⚠️ Бот не может снять роль Guest из-за иерархии."
            );
          }
        }

        // =================================================
        // ЛИЧНОЕ СООБЩЕНИЕ
        // =================================================

        try {

          await member.send({
            content:
              "🦫 **ULSA VOLUNTEER CENTER**\n\n" +
              "🎉 Поздравляем! Твоя заявка на вступление в **ULSA Volunteer Center** была одобрена.\n\n" +
              "Тебе выдана роль **Volunteer**.\n\n" +
              "Добро пожаловать в команду! 💙"
          });

        } catch (dmError) {

          console.log(
            "⚠️ Не удалось отправить ЛС принятому пользователю."
          );
        }

        // =================================================
        // ОТКЛЮЧАЕМ КНОПКИ
        // =================================================

        const disabledButtons =
          new ActionRowBuilder().addComponents(

            new ButtonBuilder()
              .setCustomId("reply")
              .setLabel("💬 Ответить")
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true),

            new ButtonBuilder()
              .setCustomId("accept")
              .setLabel("✅ Принято")
              .setStyle(ButtonStyle.Success)
              .setDisabled(true),

            new ButtonBuilder()
              .setCustomId("reject")
              .setLabel("❌ Отклонить")
              .setStyle(ButtonStyle.Danger)
              .setDisabled(true)
          );

        await interaction.message.edit({
          components: [disabledButtons]
        });

        await interaction.editReply(
          `✅ **${member.user.username}** принят в ULSA Volunteer Center!\n\n` +
          "🦫 Выдана роль **Volunteer**.\n" +
          "👤 Роль **Guest** снята."
        );

      } catch (error) {

        console.error(
          "❌ Ошибка при принятии заявки:",
          error
        );

        await interaction.editReply(
          "❌ Произошла ошибка при принятии заявки.\n\n" +
          "Проверь консоль Render."
        );
      }

      return;
    }

    // =================================================
    // ОТКЛОНИТЬ
    // =================================================

    if (interaction.customId === "reject") {

      await interaction.deferReply();

      try {

        const message =
          interaction.message;

        const embed =
          message.embeds[0];

        const discordField =
          embed?.fields?.find(
            field =>
              field.name ===
              "👤 Discord заявителя"
          );

        if (!discordField) {

          await interaction.editReply(
            "❌ Не удалось определить заявителя."
          );

          return;
        }

        const username =
          discordField.value
            .replace(/^@/, "")
            .trim();

        const guild =
          interaction.guild;

        if (!guild) {

          await interaction.editReply(
            "❌ Не удалось определить сервер."
          );

          return;
        }

        const member =
          await findMember(
            guild,
            username
          );

        // =================================================
        // ЛС ПРИ ОТКЛОНЕНИИ
        // =================================================

        if (member) {

          try {

            await member.send({
              content:
                "🦫 **ULSA VOLUNTEER CENTER**\n\n" +
                "Спасибо за подачу заявки на вступление в ULSA Volunteer Center.\n\n" +
                "К сожалению, после рассмотрения заявки было принято решение **отклонить её**.\n\n" +
                "При необходимости вы можете обратиться к руководству Volunteer Center для получения дополнительной информации."
            });

          } catch (dmError) {

            console.log(
              "⚠️ Не удалось отправить ЛС отклонённому пользователю."
            );
          }
        }

        // =================================================
        // ОТКЛЮЧАЕМ КНОПКИ
        // =================================================

        const disabledButtons =
          new ActionRowBuilder().addComponents(

            new ButtonBuilder()
              .setCustomId("reply")
              .setLabel("💬 Ответить")
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true),

            new ButtonBuilder()
              .setCustomId("accept")
              .setLabel("✅ Принять")
              .setStyle(ButtonStyle.Success)
              .setDisabled(true),

            new ButtonBuilder()
              .setCustomId("reject")
              .setLabel("❌ Отклонено")
              .setStyle(ButtonStyle.Danger)
              .setDisabled(true)
          );

        await interaction.message.edit({
          components: [disabledButtons]
        });

        await interaction.editReply(
          `❌ Заявка **${username}** отклонена.`
        );

      } catch (error) {

        console.error(
          "❌ Ошибка при отклонении:",
          error
        );

        await interaction.editReply(
          "❌ Произошла ошибка при отклонении заявки."
        );
      }

      return;
    }
  }

  // ===================================================
  // MODAL — ОТВЕТ
  // ===================================================

  if (interaction.isModalSubmit()) {

    if (
      interaction.customId ===
      "reply_modal"
    ) {

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

      try {

        const member =
          await findMember(
            guild,
            username
          );

        if (!member) {

          await interaction.reply({
            content:
              `❌ Пользователь **${username}** не найден на сервере.`,
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
              "Возможно, у него закрыты личные сообщения.",
            ephemeral: true
          });
        }

      } catch (error) {

        console.error(
          "❌ Ошибка при отправке ответа:",
          error
        );

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

// =====================================================
// ПОКАЗ «КАК ВСТУПИТЬ»
// =====================================================

async function postJoinInformation() {

  const channel =
    await client.channels.fetch(
      JOIN_CHANNEL_ID
    );

  if (!channel) {

    console.log(
      "❌ Канал «Как вступить» не найден."
    );

    return;
  }

  const messages =
    await channel.messages.fetch({
      limit: 20
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

  if (alreadyPosted) {

    console.log(
      "📝 «Как вступить» уже опубликовано."
    );

    return;
  }

  const embed =
    new EmbedBuilder()
      .setColor("#2774AE")
      .setTitle(
        "📝 КАК ВСТУПИТЬ В ULSA VOLUNTEER CENTER"
      )
      .setDescription(
        "**ULSA Volunteer Center** открыт для студентов, желающих принимать участие в университетских, общественных и благотворительных мероприятиях.\n\n" +

        "### 01. ОЗНАКОМЬТЕСЬ С ПРАВИЛАМИ\n\n" +

        `Перед подачей заявки необходимо ознакомиться с <#${RULES_CHANNEL_ID}> Volunteer Center.\n\n` +

        "Подача заявки означает, что кандидат ознакомился с установленными требованиями и готов их соблюдать.\n\n" +

        "### 02. ЗАПОЛНИТЕ ЗАЯВКУ\n\n" +

        "Для вступления необходимо заполнить официальную заявку волонтёра.\n\n" +

        "В заявке потребуется указать основную информацию о себе, контактные данные, Discord username, курс/факультет, интересующие направления деятельности и доступное время.\n\n" +

        "**Форма заявки:**\n" +
        "https://tally.so/r/QKQrDk\n\n" +

        "### 03. ДОЖДИТЕСЬ РАССМОТРЕНИЯ\n\n" +

        "После отправки заявки она поступает на рассмотрение руководству **ULSA Volunteer Center**.\n\n" +

        "При необходимости с кандидатом могут связаться через Discord для уточнения предоставленной информации.\n\n" +

        "### 04. ПОЛУЧИТЕ РЕШЕНИЕ\n\n" +

        "После рассмотрения кандидат получает уведомление о результате.\n\n" +

        "✅ **Заявка одобрена** — кандидат принят в состав Volunteer Center.\n\n" +

        "⏳ **Требуется дополнительная информация** — необходимо уточнить отдельные данные.\n\n" +

        "❌ **Заявка отклонена** — кандидат не принят в состав Volunteer Center.\n\n" +

        "### 05. НАЧНИТЕ ВОЛОНТЁРСКУЮ ДЕЯТЕЛЬНОСТЬ\n\n" +

        "После принятия волонтёр получает роль **🦫 Volunteer** и может принимать участие в доступных мероприятиях и проектах.\n\n" +

        "### 💙 ВАЖНО\n\n" +

        "Волонтёрская деятельность осуществляется на **добровольной основе**. От участника ожидаются ответственность, соблюдение правил, уважительное отношение к другим участникам и готовность выполнять принятые на себя обязательства.\n\n" +

        "**🦫 Присоединяйтесь к ULSA Volunteer Center.**"
      )
      .setImage(JOIN_IMAGE)
      .setFooter({
        text:
          "ULSA Volunteer Center • Volunteer Recruitment"
      })
      .setTimestamp();

  await channel.send({
    embeds: [embed]
  });

  console.log(
    "📝 Сообщение «Как вступить» отправлено."
  );
}

// =====================================================
// ПРАВИЛА
// =====================================================

async function postRules() {

  const channel =
    await client.channels.fetch(
      RULES_CHANNEL_ID
    );

  if (!channel) {

    console.log(
      "❌ Канал правил не найден."
    );

    return;
  }

  const messages =
    await channel.messages.fetch({
      limit: 20
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

  if (alreadyPosted) {

    console.log(
      "📑 Правила уже опубликованы."
    );

    return;
  }

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

Во время выполнения обязанностей волонтёр должен сохранять корректность и объективность.

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

В случае чрезвычайной ситуации волонтёр обязан обратиться в соответствующие экстренные службы и уведомить руководителя Volunteer Center.

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

  for (const rule of rules) {

    const embed =
      new EmbedBuilder()
        .setColor("#2774AE")
        .setTitle(rule.title)
        .setDescription(rule.description)
        .setImage(RULES_IMAGE)
        .setFooter({
          text:
            "ULSA Volunteer Center • Volunteer Guidelines"
        })
        .setTimestamp();

    await channel.send({
      embeds: [embed]
    });
  }

  console.log(
    "📑 Все правила успешно опубликованы."
  );
}

// =====================================================
// READY
// =====================================================

client.once("clientReady", async () => {

  console.log(
    `Бот запущен: ${client.user.tag}`
  );

  try {

    await postJoinInformation();

    await postRules();

    console.log(
      "✅ Все стартовые функции выполнены."
    );

  } catch (error) {

    console.error(
      "❌ Ошибка при публикации информации:",
      error
    );
  }
});

// =====================================================
// ОШИБКИ DISCORD
// =====================================================

client.on("error", error => {

  console.error(
    "❌ Discord Client Error:",
    error
  );
});

client.on(
  "warn",
  warning => {

    console.warn(
      "⚠️ Discord Warning:",
      warning
    );
  }
);

// =====================================================
// WEB SERVER
// =====================================================

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    `Сервер запущен на порту ${PORT}`
  );
});

// =====================================================
// LOGIN
// =====================================================

if (!DISCORD_TOKEN) {

  console.error(
    "❌ DISCORD_TOKEN не найден в Environment Variables."
  );

} else {

  client.login(DISCORD_TOKEN)
    .catch(error => {

      console.error(
        "❌ Не удалось войти в Discord:",
        error
      );
    });
}
