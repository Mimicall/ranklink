const { SlashCommandBuilder, PermissionsBitField, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const { readFileAsync, makeRequestEmbed, makeLogAppAcceptEmbed } = require("../../filesystem.js");
const { setUserRankInGroup, getUserRankNameInGroup, checkBotPermissions } = require("../../roblox-api.js");

let logAcceptTemplate = {
	user: null,
	oldRoblox: null,
	oldDiscord: null,
	newRoblox: null,
	newDiscord: null,
	acceptedBy: null,
	username: null
}

const CompleteButton = new ButtonBuilder()
    .setCustomId("accept")
    .setStyle(ButtonStyle.Success)
    .setLabel("Accept Request");

const DenyButton = new ButtonBuilder()
    .setCustomId("reject")
    .setStyle(ButtonStyle.Danger)
    .setLabel("Reject Request");

const buttonRow = new ActionRowBuilder()
    .addComponents(CompleteButton, DenyButton);

let requestEmbedTemplate = {
    "user": null,
    "username": null,
    "userId": null,
    "currentRole": null,
    "requestedRole": null
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName("apply")
        .setDescription("Apply for a rank in the group.")
        .addStringOption(option =>
            option
                .setName("rank")
                .setDescription("The Roblox rank you want to apply for")
                .setAutocomplete(true)
                .setRequired(true)
        ),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        try {
            let robloxdata = await readFileAsync("roblox-data.json");
            let guild = robloxdata.guilds.find(obj => obj.guild.id == interaction.guild.id);
            if (!guild) {
                await interaction.respond([]);
                return;
            }
            const roles = guild.config.requestRoles.map(obj => obj.roblox.name); // Fetch roles from the Roblox group
            const filtered = roles
                .filter(rank => rank.toLowerCase().includes(focusedValue.toLowerCase()));
            await interaction.respond(
                filtered.map(rank => ({ name: rank, value: rank }))
            );
        } catch (error) {
            console.error("Error fetching roles:", error);
            await interaction.respond([]);
        }
    },
    async execute(interaction) {
        const rank = interaction.options.getString("rank");

        try {
            // Load robloxdata JSON
            let robloxdata = await readFileAsync("roblox-data.json");
            let guild = robloxdata.guilds.find(obj => obj.guild.id == interaction.guild.id);

            if (!guild) {
                await interaction.reply("This server is not configured for Roblox group management.");
                return;
            }

            let user = robloxdata.users.find(obj => obj.discord.id == interaction.user.id);

            // Check if the user is verified
            if (!user || user.verified != "yes") {
                await interaction.reply("You need to verify your Roblox account with `/verify` first.");
                return;
            }

            // Check if the guild is ready
            if (!guild.ready) {
                await interaction.reply("The group management system is not fully configured yet.");
                return;
            }

            // Check if the bot has all necessary permissions
            const botMember = await interaction.guild.members.fetch(interaction.client.user.id);

            if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                await interaction.reply("I don't have the necessary permissions to manage roles. Please notify the staff to fix this issue.");
                return;
            }

            // Check if the request setting is automatic or manual
            const requestSetting = guild.config.requestSettings;
            if (requestSetting.mode === "automatic") {
                await interaction.deferReply({ content: "Processing your application. Due to rate limits this might take a few minutes.", ephemeral: true });
                try {
                    // Attempt to change the user's role in the Discord server and Roblox group
                    const robloxUserId = user.roblox.id;
                    const role = guild.config.requestRoles.find(obj => obj.roblox.name === rank);
                    let logTemplate = logAcceptTemplate;
                    logTemplate.username = user.roblox.username;
                    logTemplate.user = interaction.user.id;

                    if (!role) {
                        await interaction.editReply("The specified rank is not available for application.");
                        return;
                    }

                    // Change the user's rank in the Roblox group
                    await setUserRankInGroup(guild.group.id, robloxUserId, role.roblox.name);

                    logTemplate.newDiscord = role.discordRole;
                    logTemplate.newRoblox = role.roblox.name;

                    // Assign the corresponding Discord role
                    const discordRole = interaction.guild.roles.cache.get(role.discordRole);
                    if (discordRole) {
                        const member = await interaction.guild.members.fetch(interaction.user.id);

                        // Check if the user already has a role in the requestRoles and remove it
                        const existingRole = guild.config.requestRoles.find(r => member.roles.cache.has(r.discordRole));
                        if (existingRole) {
                            const existingDiscordRole = interaction.guild.roles.cache.get(existingRole.discordRole);
                            if (existingDiscordRole) {
                                logTemplate.oldDiscord = existingRole.discordRole;
                                logTemplate.oldRoblox = existingRole.roblox.name;
                                await member.roles.remove(existingDiscordRole);
                            }
                        }

                        // Add the new role
                        await member.roles.add(discordRole);

                        if (guild.config.logchannel) {
                            const logChannel = interaction.guild.channels.cache.get(guild.config.logchannel);
                            if (logChannel) {
                                const logEmbed = await makeLogAppAcceptEmbed(logTemplate);
                                await logChannel.send({ embeds: [logEmbed] });
                            }
                        }
                    }

                    await interaction.editReply(`Your rank has been updated to ${rank} in the group.`);
                } catch (error) {
                    console.error("Error updating rank:", error);
                    if (!await checkBotPermissions(guild.group.id)) {
                        await interaction.editReply("I don't have the necessary permissions to change your rank in the group. Please notify the staff to fix this issue.");
                        return;
                    }
                    await interaction.editReply("There was an error while processing your rank application.");
                }
            } else if (requestSetting.mode === "manual") {
                // Send a message to the requested channel for manual approval
                const requestChannel = interaction.guild.channels.cache.get(guild.config.requestSettings.channel);
                if (!requestChannel) {
                    await interaction.reply("The request channel is not properly configured.");
                    return;
                }

                if (!guild.config.requestRoles.some(role => role.roblox.name === rank)) {
                    await interaction.reply("The specified rank is not available for application.");
                    return;
                }

                // Make request embed
                // Buttons to accept or decline the request
                let newRequest = requestEmbedTemplate;
                newRequest.user = interaction.user.id;
                newRequest.username = user.roblox.username;
                newRequest.userId = user.roblox.id;
                let userRole = await getUserRankNameInGroup(guild.group.id, user.roblox.id);
                newRequest.currentRole = userRole;
                newRequest.requestedRole = rank;
                let requestEmbed = await makeRequestEmbed(newRequest);

                await requestChannel.send({
                    embeds: [requestEmbed],
                    components: [buttonRow]
                }
                );
                await interaction.reply("Your application has been submitted for manual review. You will receive a DM once a verdict has been reached.");
            } else {
                await interaction.reply("The request setting is not properly configured.");
            }
        } catch (error) {
            console.error("Error processing application:", error);
            await interaction.reply("An unexpected error occurred while processing your application.");
        }
    },
    
};