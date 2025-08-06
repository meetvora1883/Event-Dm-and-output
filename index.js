const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const mongoose = require('mongoose');
const Bonus = require('../models/Bonus');
const Attendance = require('../models/Attendance');

module.exports = {
  help: {
    data: new SlashCommandBuilder()
      .setName('help')
      .setDescription('Show bot help'),
    async execute(interaction) {
      const helpEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🆘 Slayers Family Attendance Bot Help')
        .setDescription('A bot to manage event attendance and POV submissions')
        .addFields(
          { name: '📋 Commands', value: '/attendance - Record event attendance\n/help - Show this message\n/bonushelp - Show bonus commands\n/parachute - Record parachute collections\n/kills - Record kills' },
          { name: '📝 Usage', value: '1. Use /attendance\n2. Select event\n3. Choose date\n4. Mention participants\n5. Provide counts for per-action events' }
        );
      await interaction.reply({ 
        embeds: [helpEmbed], 
        ephemeral: true 
      });
    }
  },
  attendance: {
    data: new SlashCommandBuilder()
      .setName('attendance')
      .setDescription('Record event attendance'),
    async execute(interaction, { CONFIG, EVENT_NAMES, EVENT_BONUS_CONFIG, INELIGIBLE_ROLES, getTomorrowDate, formatDate, isValidDate }) {
      if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
        return interaction.reply({
          content: '⛔ You lack permissions for this command.',
          ephemeral: true
        });
      }

      // Store interaction data for follow-up
      interaction.client.attendanceData = interaction.client.attendanceData || {};
      const interactionId = interaction.id;
      interaction.client.attendanceData[interactionId] = {
        userId: interaction.user.id,
        channelId: interaction.channelId
      };

      const eventSelect = new StringSelectMenuBuilder()
        .setCustomId('attendance-event-select')
        .setPlaceholder('Choose event')
        .addOptions(EVENT_NAMES.map(event => ({
          label: event.length > 25 ? `${event.substring(0, 22)}...` : event,
          value: event
        })));

      const row = new ActionRowBuilder().addComponents(eventSelect);
      await interaction.reply({
        content: '📋 Select an event:',
        components: [row],
        ephemeral: true
      });
    },
    async handleEventSelect(interaction, { EVENT_BONUS_CONFIG, getTomorrowDate }) {
      await interaction.deferUpdate();
      const eventName = interaction.values[0];
      const tomorrow = getTomorrowDate();

      // Store selected event
      interaction.client.attendanceData[interaction.message.interaction.id].eventName = eventName;

      const dateSelect = new StringSelectMenuBuilder()
        .setCustomId('attendance-date-select')
        .setPlaceholder('Choose date option')
        .addOptions([
          { label: `Tomorrow (${tomorrow})`, value: 'tomorrow' },
          { label: 'Custom date', value: 'custom' }
        ]);

      const row = new ActionRowBuilder().addComponents(dateSelect);
      await interaction.editReply({
        content: `✅ Selected: **${eventName}**\n\n📅 Choose date option:`,
        components: [row]
      });
    },
    async handleDateSelect(interaction, { getTomorrowDate, isValidDate }) {
      await interaction.deferUpdate();
      const dateOption = interaction.values[0];
      const interactionData = interaction.client.attendanceData[interaction.message.interaction.id];
      const eventName = interactionData.eventName;

      if (dateOption === 'tomorrow') {
        const tomorrow = getTomorrowDate();
        interactionData.date = tomorrow;
        await interaction.editReply({
          content: `✅ Event: **${eventName}**\n📅 Date: **${tomorrow}** (tomorrow)\n\n🔹 Mention participants: (@user1 @user2...)`,
          components: []
        });
        this.setupMentionCollector(interaction, eventName, tomorrow);
      } else if (dateOption === 'custom') {
        await interaction.editReply({
          content: `✅ Event: **${eventName}**\n\n📅 Please enter a custom date (DD/MM/YYYY):`,
          components: []
        });
        this.setupDateCollector(interaction, eventName);
      }
    },
    setupDateCollector(interaction, eventName) {
      const channel = interaction.channel;
      const filter = m => m.author.id === interaction.user.id;
      const collector = channel.createMessageCollector({ filter, time: 30000, max: 1 });

      collector.on('collect', async message => {
        try {
          const dateInput = message.content.trim();
          if (!isValidDate(dateInput)) {
            const reply = await message.reply({
              content: '❌ Invalid date format. Please use DD/MM/YYYY',
              allowedMentions: { parse: [] }
            });
            setTimeout(() => {
              reply.delete().catch(() => {});
              message.delete().catch(() => {});
            }, 5000);
            return;
          }

          // Store the date
          interaction.client.attendanceData[message.interaction.id].date = dateInput;

          await interaction.editReply({
            content: `✅ Event: ${eventName}\n📅 Date: ${dateInput}\n\n🔹 Mention participants: (@user1 @user2...)`,
            components: []
          });
          this.setupMentionCollector(interaction, eventName, dateInput);
          await message.delete().catch(() => {});
        } catch (error) {
          console.error('Date Collector Error:', error);
        }
      });
    },
    setupMentionCollector(interaction, eventName, date) {
      const channel = interaction.channel;
      const filter = m => m.author.id === interaction.user.id;
      const collector = channel.createMessageCollector({ filter, time: 30000, max: 1 });

      collector.on('collect', async mentionMessage => {
        try {
          const users = mentionMessage.mentions.users;
          if (users.size === 0) {
            const reply = await mentionMessage.reply({
              content: '❌ Please mention at least one user',
              allowedMentions: { parse: [] }
            });
            setTimeout(() => reply.delete(), 3000);
            return;
          }

          // Check if event requires per-action counts
          const bonusConfig = EVENT_BONUS_CONFIG[eventName];
          if (bonusConfig && (bonusConfig.type === 'per_kill' || bonusConfig.type === 'per_action')) {
            // Create modal to collect counts
            const modal = new ModalBuilder()
              .setCustomId(`attendance-count-modal-${Date.now()}`)
              .setTitle(`Counts for ${eventName}`);
            
            // Add input fields for each user
            users.forEach((user, index) => {
              const actionLabel = bonusConfig.type === 'per_kill' ? 'Kills' : bonusConfig.action;
              const input = new TextInputBuilder()
                .setCustomId(`user-${user.id}`)
                .setLabel(`${user.username} ${actionLabel}`)
                .setStyle(TextInputStyle.Short)
                .setPlaceholder(`Enter count for ${user.username}`)
                .setRequired(true);
              
              modal.addComponents(new ActionRowBuilder().addComponents(input));
            });
            
            // Store data for modal handler
            interaction.client.attendanceData[interaction.id] = {
              eventName,
              date,
              users: Array.from(users.values()),
              sourceMessage: mentionMessage,
              channel: interaction.channel
            };
            
            // Show the modal
            await interaction.showModal(modal);
          } else {
            // Process directly for fixed bonuses
            await this.processAttendance(eventName, date, users, mentionMessage, interaction.channel);
          }
          
          await mentionMessage.delete().catch(() => {});
        } catch (error) {
          console.error('Mention Collector Error:', error);
        }
      });
    },
    async handleModalSubmit(interaction, { CONFIG, EVENT_BONUS_CONFIG, INELIGIBLE_ROLES }) {
      await interaction.deferReply({ ephemeral: true });
      const interactionId = interaction.customId.replace('attendance-count-modal-', '');
      const eventData = interaction.client.attendanceData[interactionId];

      if (!eventData) {
        return interaction.editReply({
          content: '❌ Event data not found. Please start over.',
          ephemeral: true
        });
      }

      const { eventName, date, users, sourceMessage } = eventData;
      const bonusConfig = EVENT_BONUS_CONFIG[eventName];
      const actionLabel = bonusConfig.type === 'per_kill' ? 'kills' : bonusConfig.action;

      try {
        // Process each user
        const results = [];
        for (const user of users) {
          try {
            const countValue = interaction.fields.getTextInputValue(`user-${user.id}`);
            const count = parseInt(countValue);
            
            if (isNaN(count)) {
              throw new Error(`Invalid count for ${user.username}`);
            }

            // Save attendance record
            const attendanceRecord = new Attendance({
              eventName,
              date,
              userId: user.id,
              username: user.username,
              actionCount: count
            });
            await attendanceRecord.save();

            // Get member to check roles
            const member = await sourceMessage.guild.members.fetch(user.id);
            const isEligible = !INELIGIBLE_ROLES.some(roleId => member.roles.cache.has(roleId));
            
            // Calculate bonus if eligible
            let eventBonus = 0;
            let bonusNote = "No bonus for this event";
            
            if (bonusConfig && isEligible) {
              if (bonusConfig.type === 'per_kill' || bonusConfig.type === 'per_action') {
                eventBonus = count * bonusConfig.amount;
                bonusNote = `+$${eventBonus} for ${count} ${actionLabel}`;
                
                // Update bonus record
                await Bonus.findOneAndUpdate(
                  { userId: user.id },
                  {
                    $inc: {
                      totalBonus: eventBonus,
                      outstanding: eventBonus
                    },
                    $setOnInsert: {
                      username: user.username,
                      paid: 0
                    },
                    $push: {
                      transactions: {
                        amount: eventBonus,
                        type: 'add',
                        reason: `${count} ${actionLabel} in ${eventName}`,
                        event: eventName,
                        date: date
                      }
                    }
                  },
                  { upsert: true, new: true }
                );
              }
            } else if (!isEligible) {
              bonusNote = "Not eligible for bonus (role)";
            }

            // Get bonus summary for DM
            const bonusRecord = await Bonus.findOne({ userId: user.id }) || {
              totalBonus: 0,
              paid: 0,
              outstanding: 0
            };

            // Send DM
            const dmEmbed = new EmbedBuilder()
              .setColor(0x0099FF)
              .setTitle('🎉 Event Attendance Recorded')
              .setDescription('Thank you for participating!')
              .addFields(
                { name: '📌 Event', value: `**${eventName}**`, inline: true },
                { name: '📅 Date', value: date, inline: true },
                { name: '💰 Bonus', value: bonusNote, inline: false },
                { name: '📊 Bonus Summary', value: `Total: $${bonusRecord.totalBonus + eventBonus}\nPaid: $${bonusRecord.paid}\nOutstanding: $${bonusRecord.outstanding + eventBonus}`, inline: false },
                { name: '📸 POV Submission', value: `Submit to: <#${CONFIG.POV_CHANNEL_ID}>\n\nFormat:\n\`\`\`\n"${eventName} | @${user.username}"\n"${date}"\n\`\`\`` }
              );

            try {
              await user.send({ embeds: [dmEmbed] });
            } catch (dmError) {
              console.log(`Failed to send DM to ${user.username}:`, dmError);
            }

            results.push({ user, success: true, count });
          } catch (error) {
            console.error(`Failed to process ${user.username}:`, error);
            results.push({ user, success: false, error });
          }
        }

        const successful = results.filter(r => r.success);
        
        // Send to output channel
        const outputChannel = sourceMessage.guild.channels.cache.get(CONFIG.OUTPUT_CHANNEL_ID);
        if (outputChannel) {
          const participantList = successful
            .map(({ user, count }) => `• <@${user.id}> (${user.username}) - ${count} ${actionLabel}`)
            .join('\n');

          await outputChannel.send({
            content: `**${eventName} - Attendance**\n**Date:** ${date}\n\n${participantList}`,
            allowedMentions: { users: successful.map(({ user }) => user.id) }
          });
        }

        await interaction.editReply({
          content: `✅ Attendance recorded for ${successful.length}/${users.length} users!${
            outputChannel ? `\n📋 Posted in: <#${CONFIG.OUTPUT_CHANNEL_ID}>` : ''
          }`
        });

        // Clean up
        delete interaction.client.attendanceData[interactionId];
      } catch (error) {
        console.error('Modal Processing Error:', error);
        await interaction.editReply({
          content: '❌ An error occurred while processing attendance',
          ephemeral: true
        });
      }
    },
    async processAttendance(eventName, date, users, sourceMessage, channel) {
      try {
        const outputChannel = sourceMessage.guild.channels.cache.get(CONFIG.OUTPUT_CHANNEL_ID);
        if (!outputChannel) throw new Error('Output channel not found');

        const bonusConfig = EVENT_BONUS_CONFIG[eventName];
        const isPerAction = bonusConfig && (bonusConfig.type === 'per_kill' || bonusConfig.type === 'per_action');

        // Process each user
        const results = [];
        for (const user of users.values()) {
          try {
            // Save attendance record
            const attendanceRecord = new Attendance({
              eventName,
              date,
              userId: user.id,
              username: user.username,
              actionCount: isPerAction ? 0 : undefined
            });
            await attendanceRecord.save();

            // Get member to check roles
            const member = await sourceMessage.guild.members.fetch(user.id);
            const isEligible = !INELIGIBLE_ROLES.some(roleId => member.roles.cache.has(roleId));
            
            // Calculate bonus if eligible
            let eventBonus = 0;
            let bonusNote = "No bonus for this event";
            
            if (bonusConfig && isEligible && bonusConfig.type === 'fixed') {
              eventBonus = bonusConfig.amount;
              bonusNote = `+$${eventBonus} for participation`;
              
              // Update bonus record
              await Bonus.findOneAndUpdate(
                { userId: user.id },
                {
                  $inc: {
                    totalBonus: eventBonus,
                    outstanding: eventBonus
                  },
                  $setOnInsert: {
                    username: user.username,
                    paid: 0
                  },
                  $push: {
                    transactions: {
                      amount: eventBonus,
                      type: 'add',
                      reason: `Participation in ${eventName}`,
                      event: eventName,
                      date: date
                    }
                  }
                },
                { upsert: true, new: true }
              );
            } else if (!isEligible) {
              bonusNote = "Not eligible for bonus (role)";
            }

            // Get bonus summary for DM
            const bonusRecord = await Bonus.findOne({ userId: user.id }) || {
              totalBonus: 0,
              paid: 0,
              outstanding: 0
            };

            // Send DM
            const dmEmbed = new EmbedBuilder()
              .setColor(0x0099FF)
              .setTitle('🎉 Event Attendance Recorded')
              .setDescription('Thank you for participating!')
              .addFields(
                { name: '📌 Event', value: `**${eventName}**`, inline: true },
                { name: '📅 Date', value: date, inline: true },
                { name: '💰 Bonus', value: bonusNote, inline: false },
                { name: '📊 Bonus Summary', value: `Total: $${bonusRecord.totalBonus + eventBonus}\nPaid: $${bonusRecord.paid}\nOutstanding: $${bonusRecord.outstanding + eventBonus}`, inline: false },
                { name: '📸 POV Submission', value: `Submit to: <#${CONFIG.POV_CHANNEL_ID}>\n\nFormat:\n\`\`\`\n"${eventName} | @${user.username}"\n"${date}"\n\`\`\`` }
              );

            try {
              await user.send({ embeds: [dmEmbed] });
            } catch (dmError) {
              console.log(`Failed to send DM to ${user.username}:`, dmError);
            }

            results.push({ user, success: true });
          } catch (error) {
            console.error(`Failed to process ${user.username}:`, error);
            results.push({ user, success: false, error });
          }
        }

        const successful = results.filter(r => r.success);
        
        // Send to output channel
        const participantList = successful
          .map(({ user }) => `• <@${user.id}> (${user.username})`)
          .join('\n');

        await outputChannel.send({
          content: `**${eventName} - Attendance**\n**Date:** ${date}\n\n${participantList}`,
          allowedMentions: { users: successful.map(({ user }) => user.id) }
        });

        await sourceMessage.reply({
          content: `✅ Attendance recorded for ${successful.length}/${users.size} users!\n📋 Posted in: <#${CONFIG.OUTPUT_CHANNEL_ID}>`,
          ephemeral: true
        });
      } catch (error) {
        console.error('Attendance Processing Error:', error);
        await sourceMessage.reply({
          content: '❌ An error occurred while processing attendance',
          ephemeral: true
        });
      }
    }
  }
};
