const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

const CHECKED_FILE = path.join(__dirname, '../checkedSendungen.json');

function loadCheckedTitles() {
  if (!fs.existsSync(CHECKED_FILE)) {
    fs.writeFileSync(CHECKED_FILE, JSON.stringify({}, null, 2), 'utf-8');
    return {};
  }
  return JSON.parse(fs.readFileSync(CHECKED_FILE, 'utf-8'));
}

function saveCheckedTitles(data) {
  fs.writeFileSync(CHECKED_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

async function checkSpellingInLanguages(text) {
  const languages = ['de', 'en'];
  const results = {};

  for (const lang of languages) {
    try {
      const response = await axios.post(
        'https://api.languagetoolplus.com/v2/check',
        new URLSearchParams({ text, language: lang })
      );
      results[lang] = response.data.matches;
    } catch (error) {
      console.error(`Rechtschreibprüfung fehlgeschlagen für ${lang}:`, error.message);
      results[lang] = null;
    }
  }

  const bestLang = Object.entries(results)
    .filter(([_, matches]) => matches !== null)
    .sort((a, b) => b[1].length - a[1].length)[0];

  return {
    fehler: bestLang[1],
    sprache: bestLang[0]
  };
}

async function checkSendeplanAndNotify(channel, sendeplanApiUrl) {
  try {
    const response = await axios.get(sendeplanApiUrl);
    const sendeplan = response.data;

    const heute = new Date().toISOString().slice(0, 10);
    const checkedData = loadCheckedTitles();
    const alreadyChecked = checkedData[heute] || [];

    const neueSendungen = sendeplan.filter(s => !alreadyChecked.includes(s.titel));
    const getesteteTitel = [];
    let fehlerGesamt = 0;

    for (const sendung of neueSendungen) {
      const titel = sendung.titel;
      if (!titel) continue;

      getesteteTitel.push(titel);
      const { fehler, sprache } = await checkSpellingInLanguages(titel);

      if (fehler.length > 0) {
        fehlerGesamt += fehler.length;

        const fehlerText = fehler.map((f, i) =>
          `**Fehler ${i + 1}:** ${f.message}\n` +
          `Kontext: ...${f.context.text}...\n` +
          `Vorschläge: ${f.replacements.map(r => r.value).join(', ') || 'keine'}`
        ).join('\n\n');

        await channel.send({
          content: `@${sendung.dj || 'Unbekannt'}, im Titel **"${titel}"** wurden Fehler gefunden:`,
          embeds: [
            new EmbedBuilder()
              .setTitle('✏️ Rechtschreibfehler entdeckt')
              .setDescription(fehlerText)
              .setColor(0xFF0000)
              .setFooter({ text: `Sprache: ${sprache.toUpperCase()} • Sendungstitel: ${titel}` })
          ]
        });
      }
    }

    checkedData[heute] = [...new Set([...(checkedData[heute] || []), ...getesteteTitel])];
    saveCheckedTitles(checkedData);

    if (getesteteTitel.length === 0) return;

    const embed = new EmbedBuilder()
      .setTitle('📻 Sendeplan-Prüfung')
      .setTimestamp();

    if (fehlerGesamt === 0) {
      embed.setDescription(
        `✅ **${getesteteTitel.length} neue Titel geprüft – keine Fehler gefunden.**\n\n` +
        getesteteTitel.map(t => `• ${t}`).join('\n')
      ).setColor(0x00FF00);
    } else {
      embed.setDescription(
        `⚠️ **${getesteteTitel.length} Titel geprüft – ${fehlerGesamt} Fehler gefunden.**\n\n` +
        getesteteTitel.map(t => `• ${t}`).join('\n')
      ).setColor(0xFF0000);
    }

  } catch (error) {
    console.error('Fehler beim Prüfen des Sendeplans:', error.message);
    await channel.send('Fehler beim Abrufen oder Verarbeiten des Sendeplans.');
  }
}

async function startSendeplanChecker(client) {
  const channel = await client.channels.fetch(config.internalBotchannelId);
  if (!channel) {
    console.error("❌ Channel nicht gefunden.");
    return;
  }

  console.log("📡 Starte erste Rechtschreibprüfung für Sendungstitel...");
  await checkSendeplanAndNotify(channel, config.BTFM_baseAPI + "?output=sendeplan");

  console.log("⏲ Plane Intervallprüfung alle 10 Minuten...");
  setInterval(async () => {
    await checkSendeplanAndNotify(channel, config.BTFM_baseAPI + "?output=sendeplan");
  }, 10 * 60 * 1000);

  console.log("🌙 Plane Mitternachts-Reset für geprüfte Titel...");
  cron.schedule("0 0 * * *", () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const data = loadCheckedTitles();
      const reset = { [today]: data[today] || [] };
      saveCheckedTitles(reset);
      console.log("🔄 checkedSendungen.json wurde zurückgesetzt.");
    } catch (err) {
      console.error("❌ Fehler beim Zurücksetzen:", err.message);
    }
  }, { timezone: "Europe/Berlin" });
}

module.exports = {
  checkSpelling: checkSpellingInLanguages,
  checkSendeplanAndNotify,
  startSendeplanChecker
};