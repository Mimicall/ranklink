const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } = require('discord.js');

const helpEmbed = new EmbedBuilder()
  .setTitle('📖 RankLink Help Menu')
  .setDescription('Welcome to **RankLink**, your Roblox rank syncing bot for Discord! Use the commands below to get started.')
  .addFields(
    { name: '🔐 Verification', value: '`/verify` – Link your Roblox account to your Discord.' },
    { name: '🛠️ Admin Setup', value: '`/setup` – Request bot activation for this server.\n`/config display` – View server config.\n`/config requestrole` – Add/remove Roblox rank ↔ Discord role links.\n`/config staff` – Add/remove staff roles for review.\n`/config log` – Set or disable logging channels.\n`/config applications` – Set mode (`automatic`/`manual`) and request review channel.' },
    { name: '📝 User Action', value: '`/apply` – Request a rank/role change.' },
    { name: '💬 Need Help?', value: 'Click the buttons below to get support.' }
  )
  .setColor(0x5865F2)
  .setFooter({ text: 'RankLink Bot | Powered by Roblox + Discord' });

const row = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder()
      .setLabel('Support Server')
      .setStyle(ButtonStyle.Link)
      .setURL('https://discord.gg/FaQmxHxPM5'),
    new ButtonBuilder()
      .setLabel('GitHub Repository')
      .setStyle(ButtonStyle.Link)
      .setURL('https://github.com/YOUR_REPO_HERE'),
    new ButtonBuilder()
      .setLabel('Invite Bot')
      .setStyle(ButtonStyle.Link)
      .setURL('https://discord.com/oauth2/authorize?client_id=1371422603331239976&scope=bot+applications.commands+identify&permissions=277293911040')
  );

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("View a list of commands and learn how to use RankLink."),
    async execute(interaction, client) {
        await interaction.reply({ embeds: [helpEmbed], components: [row], ephemeral: true });
    }
}