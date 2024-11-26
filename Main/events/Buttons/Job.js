const { Main } = require("../../../Utilities/Settings/config.js");
const {
  Events,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Colors,
} = require("discord.js");
const jobSchema = require("../../../Utilities/Database/Job");

module.exports = {
  name: Events.InteractionCreate,
  async start(client, interaction) {
    if (interaction.isButton()) {
      let logChannel, threadId, messageId;

      if (interaction.customId === "jobButton") {
        let dataGD = await jobSchema.findOne({ GuildID: interaction.guild.id });
        messageId = interaction.message.id;

        const job = dataGD.Jobs.find((job) => job.MessageID === messageId);

        const jobUsersControl = job.Users.find(
          (user) => user.UserID === interaction.user.id
        );
        if (jobUsersControl) {
          return interaction.reply({
            content: "Bu işe zaten başvurdunuz.",
            ephemeral: true,
          });
        }

        threadId = job.ThreadID;
        logChannel = client.channels.cache.get(dataGD.LogChannel);

        const modal = new ModalBuilder()
          .setCustomId(`jobModal_${messageId}`)
          .setTitle("Yetkili Alımı");

        const firstActionRow = new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("userName")
            .setLabel("İsim?")
            .setRequired(true)
            .setStyle(TextInputStyle.Short)
        );
        const secondActionRow = new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("userAge")
            .setLabel("Yaşınız?")
            .setRequired(true)
            .setStyle(TextInputStyle.Short)
        );
        const thirdActionRow = new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("userActivity")
            .setLabel("Sunucuda aktif kalacak mısın?")
            .setRequired(true)
            .setStyle(TextInputStyle.Short)
        );
        const fourthActionRow = new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("userActivity2")
            .setLabel("Sunucuda ne kadar aktif kalacaksın?")
            .setRequired(true)
            .setStyle(TextInputStyle.Short)
        );
        const fifthActionRow = new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("userAbout")
            .setLabel("Hakkında?")
            .setStyle(TextInputStyle.Paragraph)
            .setMinLength(50)
            .setMaxLength(220)
            .setRequired(false)
        );

        modal.addComponents(
          firstActionRow,
          secondActionRow,
          thirdActionRow,
          fourthActionRow,
          fifthActionRow
        );
        await interaction.showModal(modal);
      }

      if (interaction.customId.startsWith("acceptButton_")) {
        let dataGD = await jobSchema.findOne({ GuildID: interaction.guild.id });

        const permRoleControl = interaction.member.roles.cache.has(
          dataGD.StaffRole
        );
        if (!permRoleControl) {
          return interaction.reply({
            content: "Bu işlemi gerçekleştirmek için yetkiniz yok.",
            ephemeral: true,
          });
        }

        const messageId = interaction.customId.split("_")[1];
        const userId = interaction.customId.split("_")[2];
        const job = dataGD.Jobs.find((job) => job.MessageID === messageId);

        const logMessageId = job.Users.find(
          (user) => user.UserID === userId
        ).LogMessageID;

        const staffRole = interaction.guild.roles.cache.get(job.StaffRole);
        const user = interaction.guild.members.cache.get(userId);

        const messageFetch = await client.channels.cache
          .get(dataGD.LogChannel)
          .messages.fetch(logMessageId);

        const acceptRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("Acceoted")
            .setLabel("Kabul edildi.")
            .setEmoji("✅")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true)
        );

        await user.roles.add(staffRole.id);

        const userControl = job.Users.find((user) => user.UserID === userId);

        await job.Users.splice(job.Users.indexOf(userControl), 1);
        await jobSchema.updateOne(
          { GuildID: interaction.guild.id },
          { $set: { Jobs: dataGD.Jobs } }
        );

        await dataGD.save();

        messageFetch.edit({
          components: [acceptRow],
        });
      }

      if (interaction.customId.startsWith("declineButton_")) {
        let dataGD = await jobSchema.findOne({ GuildID: interaction.guild.id });
        const permRoleControl = interaction.member.roles.cache.has(
          dataGD.StaffRole
        );

        if (!permRoleControl) {
          return interaction.reply({
            content: "Bu işlemi gerçekleştirmek için yetkiniz yok.",
            ephemeral: true,
          });
        }

        const messageId = interaction.customId.split("_")[1];
        const userId = interaction.customId.split("_")[2];
        const job = dataGD.Jobs.find((job) => job.MessageID === messageId);
        const logMessageId = job.Users.find(
          (user) => user.UserID === userId
        ).LogMessageID;
        const staffRole = interaction.guild.roles.cache.get(job.StaffRole);
        const user = interaction.guild.members.cache.get(userId);

        const messageFetch = await client.channels.cache
        .get(dataGD.LogChannel)
        .messages.fetch(logMessageId);

        const rejectRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("Rejected")
            .setLabel("Reddedildi.")
            .setEmoji("❌")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true)
        );

        const userControl = job.Users.find((user) => user.UserID === userId);

        await job.Users.splice(job.Users.indexOf(userControl), 1);
        await jobSchema.updateOne(
          { GuildID: interaction.guild.id },
          { $set: { Jobs: dataGD.Jobs } }
        );
        await dataGD.save();

        messageFetch.edit({
          components: [rejectRow],
        });

        return;
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith("jobModal_")) {
        let dataGD = await jobSchema.findOne({ GuildID: interaction.guild.id });

        const messageId = interaction.customId.split("_")[1];

        const job = dataGD.Jobs.find((job) => job.MessageID === messageId);
        const jobName = job.JobName;
        const logChannel = client.channels.cache.get(dataGD.LogChannel);

        const userName = interaction.fields.getTextInputValue("userName");
        const userAge = interaction.fields.getTextInputValue("userAge");
        const userActivity =
          interaction.fields.getTextInputValue("userActivity");
        const userActivity2 =
          interaction.fields.getTextInputValue("userActivity2");
        const userAbout = interaction.fields.getTextInputValue("userAbout");

        const user = interaction.user;
        const userAvatar = user.displayAvatarURL();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`acceptButton_${messageId}_${user.id}`)
            .setLabel("Kabul Et")
            .setEmoji("✅")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`declineButton_${messageId}_${user.id}`)
            .setLabel("Reddet")
            .setEmoji("❌")
            .setStyle(ButtonStyle.Danger)
        );

        const embed = new EmbedBuilder()
          .setColor(Colors.Blue)
          .setTitle(`Yetkili Alımı | ${jobName}`)
          .setFields(
            {
              name: "Kullanıcı",
              value: `${interaction.user}`
            },
            {
              name: "İsim",
              value: `\`\`\`${userName}\`\`\``,
            },
            {
              name: "Yaş",
              value: `\`\`\`${userAge}\`\`\``,
            },
            {
              name: "Aktiflik",
              value: `\`\`\`${userActivity}\`\`\``,
            },
            {
              name: "Aktiflik Süresi",
              value: `\`\`\`${userActivity2}\`\`\``,
            },
            {
              name: "Hakkında",
              value: `\`\`\`${userAbout || "Bilinmiyor"}\`\`\``,
            }
          )
          .setThumbnail(userAvatar)
          .setTimestamp();

        logChannel
          .send({ embeds: [embed], components: [row] })
          .then(async (msg) => {
            job.Users.push({
              Status: "Bekleniyor..",
              UserID: user.id,
              JobMessageID: messageId,
              LogMessageID: msg.id,
            });

            await dataGD.save();
          });

        await interaction.reply({
          content: "Başarıyla gönderildi!",
          ephemeral: true,
        });
      }
    }
  },
};
