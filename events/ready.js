const { Events } = require('discord.js');
const { startDJipgenMention } = require('../functions/djipgenMention');
const { startSendeplanChecker } = require('../functions/sendeplanChecker');
const { startVanityCheck } = require('../functions/vanityCheck');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ Bot bereit! Eingeloggt als ${client.user.tag}`);

    startDJipgenMention(client);
    await startSendeplanChecker(client);
    startVanityCheck(client);
  },
};
