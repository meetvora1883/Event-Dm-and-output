require('dotenv').config();

module.exports = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID || '1402002510885163058',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://meetvora1883:meetvora1883@discordbot.xkgfuaj.mongodb.net/?retryWrites=true&w=majority',
  PORT: process.env.PORT || 10000,
  
  // Channel IDs
  POV_CHANNEL_ID: process.env.POV_CHANNEL_ID || '1398888616532643860',
  OUTPUT_CHANNEL_ID: process.env.OUTPUT_CHANNEL_ID || '1398888616532643861',
  COMMAND_CHANNEL_ID: process.env.COMMAND_CHANNEL_ID || '1398888617312518188',
  
  // Role IDs
  ADMIN_ROLE_IDS: process.env.ADMIN_ROLE_IDS?.split(',') || ['1398888612388540538', '1398888612388540537'],
  INELIGIBLE_ROLES: process.env.INELIGIBLE_ROLES?.split(',') || [],

  // Event bonus configuration
  EVENT_BONUS_CONFIG: {
    "Family raid (Attack)": { type: "fixed", amount: 15000 },
    "Family raid (Protection)": { type: "fixed", amount: 15000 },
    "State Object": { type: "fixed", amount: 8000 },
    "Turf": { type: "fixed", amount: 0 },
    "Store robbery": { type: "fixed", amount: 0 },
    "Caravan delivery": { type: "fixed", amount: 0 },
    "Attacking Prison": { type: "fixed", amount: 0 },
    "ℍ𝕒𝕣𝕓𝕠𝕣 (battle for the docks)": { type: "per_action", action: "parachute", amount: 25000 },
    "𝕎𝕖𝕒𝕡𝕠𝕟𝕤 𝔽𝕒𝕔𝕥𝕠𝕣𝕪": { type: "per_kill", amount: 25000 },
    "𝔻𝕣𝕦𝕘 𝕃𝕒𝕓": { type: "fixed", amount: 0 },
    "𝔽𝕒𝕔𝕥𝕠𝕣𝕪 𝕠𝕗 ℝℙ 𝕥𝕚𝕔𝕜𝕖𝕥𝕤": { type: "fixed", amount: 300000 },
    "𝔽𝕠𝕦𝕟𝕕𝕣𝕪": { type: "per_kill", amount: 20000 },
    "𝕄𝕒𝕝𝕝": { type: "fixed", amount: 75000 },
    "𝔹𝕦𝕤𝕚𝕟𝕖𝕤𝕤 𝕎𝕒𝕣": { type: "per_kill", amount: 80000 },
    "𝕍𝕚𝕟𝕖𝕪𝕒𝕣𝕕": { type: "per_action", action: "harvest", amount: 20000 },
    "𝔸𝕥𝕥𝕒𝕔𝕜𝕚𝕟𝕘 ℙ𝕣𝕚𝕤𝕠𝕟 (𝕠𝕟 𝔽𝕣𝕚𝕕𝕒𝕪)": { type: "fixed", amount: 0 },
    "𝕂𝕚𝕟𝕘 𝕆𝕗 ℂ𝕒𝕪𝕠 ℙ𝕖𝕣𝕚𝕔𝕠 𝕀𝕤𝕝𝕒𝕟𝕕 (𝕠𝕟 𝕎𝕖𝕕𝕟𝕖𝕤𝕕𝕒𝕪 𝕒𝕟𝕕 𝕊𝕦𝕟𝕕𝕒𝕪)": { type: "fixed", amount: 0 },
    "𝕃𝕖𝕗𝕥𝕠𝕧𝕖𝕣 ℂ𝕠𝕞𝕡𝕠𝕟𝕖𝕟𝕥𝕤": { type: "fixed", amount: 0 },
    "ℝ𝕒𝕥𝕚𝕟𝕘 𝔹𝕒𝕥𝕥𝕝𝕖": { type: "per_kill", amount: 20000 },
    "𝔸𝕚𝕣𝕔𝕣𝕒𝕗𝕥 ℂ𝕒𝕣𝕣𝕚𝕖𝕣 (𝕠𝕟 𝕊𝕦𝕟𝕕𝕒𝕪)": { type: "per_action", action: "parachute", amount: 50000 },
    "𝔹𝕒𝕟𝕜 ℝ𝕠𝕓𝕓𝕖𝕣𝕪": { type: "fixed", amount: 35000 },
    "ℍ𝕠𝕥𝕖𝕝 𝕋𝕒𝕜𝕖𝕠𝕧𝕖𝕣": { type: "per_kill", amount: 20000 },
    "Family War": { type: "fixed", amount: 0 },
    "Money Printing Machine": { type: "fixed", amount: 0 },
    "Informal (Battle for business for unofficial organization)": { type: "per_kill", amount: 50000 }
  }
};
