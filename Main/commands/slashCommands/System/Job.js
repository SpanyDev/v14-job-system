const {
  SlashCommandBuilder,
  EmbedBuilder,
  Colors,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const jobSchema = require("../../../../Utilities/Database/Job");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("job")
    .setDescription("Job")
    .setDefaultMemberPermissions(8)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("Setup")
        .addChannelOption((option) =>
          option
            .setName("jobchannel")
            .setDescription("The channel to log to.")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildForum)
        )
        .addChannelOption((option) =>
          option
            .setName("logchannel")
            .setDescription("The channel to log to.")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addRoleOption((option) =>
          option
            .setName("staff-role")
            .setDescription("The role to give to staff members.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("The name of the audit log.")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("The description of the audit log.")
            .setRequired(true)
        )
        .addRoleOption((option) =>
          option
            .setName("staff-role")
            .setDescription("The role to give to staff members.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove.")
        .addStringOption((option) =>
          option
            .setName("messageid")
            .setDescription("Message ID?")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("edit")
        .setDescription("Edit")
        .addStringOption((option) =>
          option
            .setName("messageid")
            .setDescription("Message ID?")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("status")
            .setDescription("Status.")
            .setRequired(true)
            .addChoices(
              { name: "Active", value: "Active" },
              { name: "Inactive", value: "Inactive" }
            )
        )
    ),
  commandPermissions: [],
  usage: "/job",
  developerOnly: false,
  async start(client, interaction) {
    const { options, guild, user, member } = interaction;
    const subCommand = options.getSubcommand();
    let dataGD = await jobSchema.findOne({ GuildID: guild.id });

    const rEmbed = new EmbedBuilder().setFooter({
      text: "Atlas | Job System",
      iconURL: client.user.displayAvatarURL(),
    });

    switch (subCommand) {
      case "setup":
        let response;

        if (!dataGD) {
          rEmbed
            .setColor(Colors.Blue)
            .setTitle("Job System Setup")
            .setDescription(
              `> *Yeni sunucu algılandı, sunucunuz için yeni veriler oluşturuluyor.*`
            );

          response = await interaction.reply({
            embeds: [rEmbed],
            fetchReply: true,
            ephemeral: true,
          });

          dataGD = new jobSchema({
            GuildID: guild.id,
            JobChannel: options.getChannel("jobchannel").id,
            LogChannel: options.getChannel("logchannel").id,
            StaffRole: options.getRole("staff-role").id,
          });
          await dataGD.save();
        } else {
          response = interaction.reply({
            embeds: [
              rEmbed
                .setColor(Colors.Red)
                .setDescription(`> *Sunucu için ayarlarınız zaten mevcut.*`),
            ],
            fetchReply: true,
            ephemeral: true,
          });
          return;
        }

        rEmbed
          .setColor(Colors.Blue)
          .setDescription(`> *Sunucu için ayarlarınız güncellendi.*`)
          .setFields(
            {
              name: "Job Channel",
              value: `> <#${dataGD.JobChannel}>`,
              inline: true,
            },
            {
              name: "Log Channel",
              value: `> <#${dataGD.LogChannel}>`,
              inline: true,
            },
            {
              name: "Staff Role",
              value: `> <@&${dataGD.StaffRole}>`,
              inline: true,
            }
          );

        interaction.editReply({
          embeds: [rEmbed],
          ephemeral: true,
        });
        break;
      case "add":
        const jobName = options.getString("name");
        const jobDescription = options.getString("description");
        const staffRole = options.getRole("staff-role");

        if (!dataGD) {
          interaction.reply({
            embeds: [
              rEmbed
                .setColor(Colors.Red)
                .setDescription(`> *Sunucu için ayarlarınız mevcut değil.*`),
            ],
            fetchReply: true,
            ephemeral: true,
          });
          return;
        }

        const btnRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`jobButton`)
            .setLabel("Apply")
            .setEmoji("📬")
            .setDisabled(false)
            .setStyle(ButtonStyle.Primary)
        );

        const embed = new EmbedBuilder()
          .setColor(Colors.Blue)
          .setTitle(jobName)
          .setDescription(jobDescription)
          .addFields({
            name: "Status",
            value: `> Açık`,
            inline: true,
          })
          .setTimestamp()
          .setFooter({
            text: "Atlas | Job System",
            iconURL: client.user.displayAvatarURL(),
          });

        const jobChannel = guild.channels.cache.get(dataGD.JobChannel);
        const thread = await jobChannel.threads.create({
          name: jobName,
          message: {
            embeds: [embed],
            components: [btnRow],
          },
        });

        const starterMessage = await thread.fetchStarterMessage();
        await jobSchema.updateOne(
          { GuildID: guild.id },
          {
            $push: {
              Jobs: {
                JobName: jobName,
                ThreadID: thread.id,
                MessageID: starterMessage.id,
                StaffRole: staffRole.id,
                Status: "Active",
                Users: [],
              },
            },
          }
        );

        interaction.reply({
          embeds: [
            rEmbed
              .setColor(Colors.Blue)
              .setDescription(`> *İşiniz başarıyla oluşturuldu.*`)
              .setFields(
                {
                  name: "Job Name",
                  value: `> ${jobName}`,
                  inline: true,
                },
                {
                  name: "Job Description",
                  value: `> ${jobDescription}`,
                  inline: true,
                },
                {
                  name: "Staff Role",
                  value: `> <@&${staffRole.id}>`,
                  inline: true,
                }
              ),
          ],
          fetchReply: true,
          ephemeral: true,
        });

        break;
      case "remove":
        const messageID = options.getString("messageid");

        const job = dataGD.Jobs.find((job) => job.MessageID === messageID);
        const JobThreadId = job.ThreadID;

        const JobThread = await client.channels.fetch(JobThreadId);
        await JobThread.delete();

        await jobSchema.updateOne(
          { GuildID: guild.id },
          {
            $pull: {
              Jobs: {
                MessageID: messageID,
              },
            },
          }
        );

        interaction.reply({
          embeds: [
            rEmbed
              .setColor(Colors.Blue)
              .setDescription(`> *İşiniz başarıyla silindi.*`),
          ],
          fetchReply: true,
          ephemeral: true,
        });
        break;
      case "edit":
        const messageId = options.getString("messageid");
        const status = options.getString("status");

        const jobData = dataGD.Jobs.find((job) => job.MessageID === messageId);
        const jobThreadId = jobData.ThreadID;

        let updateRow;

        const messageFetch = await client.channels.cache
          .get(jobThreadId)
          .messages.fetch(messageId);

        const updateEmbed = messageFetch.embeds[0];

        const messageEmbed = new EmbedBuilder(updateEmbed).setFields(
          {
            name: updateEmbed.fields[0].name,
            value: `> ${status}`,
            inline: updateEmbed.fields[0].inline,
          },
          ...updateEmbed.fields.slice(1)
        );

        if (status === "Active") {
          updateRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`jobButton`)
              .setLabel("Apply")
              .setEmoji("📬")
              .setDisabled(false)
              .setStyle(ButtonStyle.Primary)
          );
        } else {
          updateRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`jobButton`)
              .setLabel("Apply")
              .setEmoji("📬")
              .setDisabled(true)
              .setStyle(ButtonStyle.Secondary)
          );
        }

        await messageFetch.edit({
          embeds: [messageEmbed],
          components: [updateRow],
        });

        await jobSchema.updateOne(
          { GuildID: guild.id, "Jobs.MessageID": messageId },
          {
            $set: {
              "Jobs.$.Status": status,
            },
          }
        );

        interaction.reply({
          embeds: [
            rEmbed
              .setColor(Colors.Blue)
              .setDescription(`> *İşiniz başarıyla güncellendi.*`),
          ],
          fetchReply: true,
          ephemeral: true,
        });
        break;
    }
  },
};
