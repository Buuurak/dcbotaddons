const config = require("../config.json");

let lastBoostCount = null;

function startVanityCheck(client) {
  console.log("🎉 Vanity Check gestartet.");

  setInterval(async () => {
    const guild = await client.guilds.fetch(config.guildId);
    const channel = await client.channels.fetch(config.internalBotchannelId);
    const currentBoosts = guild.premiumSubscriptionCount;
    const boostAdvantages = 3;
    const realBoosts = currentBoosts - boostAdvantages;
    const threshold = config.vanityCheck_reqBoost;

    if (lastBoostCount === null) {
      lastBoostCount = realBoosts;
      return;
    }

    if (lastBoostCount >= threshold && realBoosts < threshold) {
      await channel.send(`<@&${config.radioleitungRoleId}> Jemand hat seinen Boost **entfernt** – Vanity-Link entfernt.`);
    }

    if (lastBoostCount < threshold && realBoosts >= threshold) {
      await channel.send(`<@&${config.radioleitungRoleId}> Der Server hat nun wieder ${threshold} Boosts! Bitte setzt den Vanity-Link neu.`);
    }

    lastBoostCount = realBoosts;
  }, 60 * 1000);
}

module.exports = {
  startVanityCheck
};
