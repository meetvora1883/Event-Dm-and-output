const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { EVENT_BONUS_CONFIG } = require('../config');

// Date utilities
function getTomorrowDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDate(tomorrow);
}

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function isValidDate(dateString) {
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!regex.test(dateString)) return false;

  const [day, month, year] = dateString.split('/').map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getDate() === day &&
    date.getMonth() === month - 1 &&
    date.getFullYear() === year
  );
}

// Helper function to create event select menu
function createEventSelectMenu() {
  const eventSelect = new StringSelectMenuBuilder()
    .setCustomId('event-select')
    .setPlaceholder('Choose event')
    .addOptions(Object.keys(EVENT_BONUS_CONFIG).map(event => ({
      label: event.length > 25 ? `${event.substring(0, 22)}...` : event,
      value: event
    })));

  return new ActionRowBuilder().addComponents(eventSelect);
}

// Helper function to create date select menu
function createDateSelectMenu() {
  const tomorrow = getTomorrowDate();
  const dateSelect = new StringSelectMenuBuilder()
    .setCustomId('date-select')
    .setPlaceholder('Choose date option')
    .addOptions([
      { label: `Tomorrow (${tomorrow})`, value: 'tomorrow' },
      { label: 'Custom date', value: 'custom' }
    ]);

  return new ActionRowBuilder().addComponents(dateSelect);
}

module.exports = {
  getTomorrowDate,
  formatDate,
  isValidDate,
  createEventSelectMenu,
  createDateSelectMenu
};
