const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('singlecharts')
    .setDescription('Zeigt die Top 5 Chart Tracks in Deutschland'),

  async execute(interaction) {
    const playlistId = '1111143121';
    const url = `https://api.deezer.com/playlist/${playlistId}`;

    try {
      const res = await globalThis.fetch(url);
      if (!res.ok) throw new Error(`API Fehler: ${res.status}`);
      const data = await res.json();

      const topTracks = data.tracks.data.slice(0, 5);

      const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

      const description = topTracks.map((track, i) => {
        return `${emojis[i]} ${track.artist.name} – ${track.title}`;
      }).join('\n\n');

      const embed = new EmbedBuilder()
        .setTitle('🇩🇪 Top 5 Chart Tracks Deutschland')
        .setColor(0x1e1e1e)
        .setThumbnail(topTracks[0].album.cover_medium)
        .setDescription(description)
        .setFooter({ text: 'Quelle: Deezer – Top Germany Playlist' });

      const buttons = new ActionRowBuilder();
      topTracks.forEach((track, i) => {
        buttons.addComponents(
          new ButtonBuilder()
            .setLabel(`${emojis[i]}`)
            .setStyle(ButtonStyle.Link)
            .setURL(track.link)
        );
      });

      await interaction.reply({ embeds: [embed], components: [buttons] });

    } catch (error) {
      console.error('Fehler beim Abrufen der Deezer-Charts:', error);
      await interaction.reply('❌ Fehler beim Abrufen der deutschen Charts von Deezer.');
    }
  },
};
