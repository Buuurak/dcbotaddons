const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const { djipgenMention_automodRule, BTFM_baseAPI, guildId } = config;

function getCurrentTime() {
  const now = new Date();
  return { hour: now.getHours(), minute: now.getMinutes() };
}

function parseTime(str) {
  const [hour, minute] = str.split(':').map(Number);
  return { hour, minute };
}

function isNowBetween(start, end, now) {
  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;
  const nowMinutes = now.hour * 60 + now.minute;
  return startMinutes <= nowMinutes && nowMinutes < endMinutes;
}

async function djipgenMention(client) {
  try {
    const response = await fetch(BTFM_baseAPI + "?output=sendeplan");
    const data = await response.json();

    const now = getCurrentTime();
    let djipgenActive = false;

    for (const show of data) {
      if (show.dj && show.dj.toLowerCase() === 'djipgen') {
        const end = parseTime(show.ende);
        if (isNowBetween(start, end, now)) {
          djipgenActive = true;
          break;
        }
      }
    }

    const guild = await client.guilds.fetch(guildId);
    const rule = await guild.autoModerationRules.fetch(djipgenMention_automodRule);

    if (djipgenActive && rule.enabled) {
      await setAutomodRule(rule, false);
    } else if (!djipgenActive && !rule.enabled) {
      await setAutomodRule(rule, true);
    } else {
    }
  } catch (err) {
    console.error('Fehler beim Sendeplan-Check:', err);
  }
}

async function setAutomodRule(rule, enable) {
  try {
    await rule.setEnabled(enable);
    console.log(`AutoMod-Regel ${rule.id} wurde ${enable ? 'aktiviert' : 'deaktiviert'}.`);
  } catch (err) {
    console.error(`Fehler beim Umschalten der AutoMod-Regel ${rule.id}:`, err);
  }
}

function nextQuarterHour(now) {
  const minutes = now.getMinutes();
  let target = new Date(now);
  if (minutes < 15) target.setMinutes(15, 0, 0);
  else if (minutes < 30) target.setMinutes(30, 0, 0);
  else if (minutes < 45) target.setMinutes(45, 0, 0);
  else {
    target.setHours(target.getHours() + 1);
    target.setMinutes(0, 0, 0);
  }
  if (target <= now) {
    target = new Date(now);
    target.setMinutes(target.getMinutes() + 15 - (target.getMinutes() % 15));
    target.setSeconds(0, 0);
  }
  return target;
}

function startDJipgenMention(client) {
  const now = new Date();
  const nextQuarter = nextQuarterHour(now);
  const delay = nextQuarter - now;

  console.log(`🕒 djipgenMention startet in ${delay / 1000} Sekunden (um ${nextQuarter.toLocaleTimeString()})`);
  setTimeout(() => {
    djipgenMention(client);
    setInterval(() => djipgenMention(client), 15 * 60 * 1000);
  }, delay);
}

module.exports = {
  startDJipgenMention
};