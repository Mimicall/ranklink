const { SlashCommandBuilder, PermissionsBitField, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const { getGroupList } = require("../../roblox-api.js");
const { readFileAsync, writeFileAsync, makeGroupJoinEmbed } = require("../../filesystem.js");

const CompleteButton = new ButtonBuilder()
    .setCustomId("complete")
    .setStyle(ButtonStyle.Success)
    .setLabel("Complete Request");

const DenyButton = new ButtonBuilder()
    .setCustomId("deny")
    .setStyle(ButtonStyle.Danger)
    .setLabel("Deny Request");

const buttonRow = new ActionRowBuilder()
    .addComponents(CompleteButton, DenyButton);

/*
- params: groupId (or name if possible), 
*/
module.exports = {
    data: new SlashCommandBuilder()
        .setName("setup")
        .setDescription("Setup the discord server to be used with the bot! (Admin only)")
        .addStringOption(option =>
            option
                .setName("groupid")
                .setDescription("Id of the group. (Found in the link when on your group home page)")
                .setRequired(true)
        ),
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return await interaction.reply({
            content: "You do not have permission to use this command! (Manage Server permissions needed)",
            ephemeral: true
        });
        let robloxdata = await readFileAsync("roblox-data.json");
        let groupId = Number(interaction.options.getString("groupid"));

        if (robloxdata) {
            let user = robloxdata.users.find(obj => obj.discord.id == interaction.user.id);

            if (user) {
                if (user.verified == "yes") {
                    let guild = robloxdata.guilds.find(obj => obj.guild.id == interaction.guild.id)
                    if (guild && guild.ready) return await interaction.reply({
                        content: "This guild is already managing a group.",
                        ephemeral: true
                    });
                    if (robloxdata.guilds.some(obj => obj.guild.id == interaction.guild.id && 
                        obj.requesting)) return await interaction.reply({
                        content: "You already have an active request.",
                        ephemeral: true
                    });

                    let groups = await getGroupList(user.roblox.id);
                    let group = groups.find(obj => obj.Id == groupId);

                    if (group) {
                        if (group.Rank >= 250) {
                            try {
                                let discordName = user.discord.name;
                                let iconURL = interaction.user.displayAvatarURL({ dynamic: true, size: 512 });
                                let discordId = interaction.user.id;
                                let newName = group.Name;
                                newName = newName.replaceAll(" ", "-");
                                let groupURL = `https://www.roblox.com/communities/${groupId}/${newName}/`;
                                let guildName = interaction.member.guild.name;
                                let guildId = interaction.guildId;
                                let guildMembers = interaction.member.guild.memberCount.toString();
                                let groupName = group.Name;
                                let newGroupId = groupId.toString();
                                let groupMembers = group.MemberCount.toString();
                                let robloxUser = user.roblox.username;
                                let robloxRankName = group.Role;
                                let robloxRank = group.Rank.toString();

                                console.log(groupURL);

                                const guild = await client.guilds.fetch(robloxdata.adminGuild.guildId);

                                const channel = await guild.channels.fetch(robloxdata.adminGuild.requestchannelId);

                                let embed = await makeGroupJoinEmbed(discordName, iconURL, discordId, groupURL, guildName, guildId,
                                    guildMembers, groupName, newGroupId, groupMembers, robloxUser, robloxRankName, robloxRank
                                );

                                let guildJSON = robloxdata.guilds.find(obj => obj.guild.id == interaction.guild.id)
                                if (!guildJSON) {
                                    guildJSON = {
                                        "ready": false,
                                        "requesting": interaction.user.id,
                                        "guild": {
                                            "name": interaction.guild.name,
                                            "id": interaction.guild.id
                                        },
                                        "group": {
                                            "name": group.Name,
                                            "id": group.Id
                                        },
                                        "config": {
                                            "logchannel": null,
                                            "staffRoles": [],
                                            "requestRoles": [],
                                            "requestSettings": {
                                                "mode": "automatic",
                                                "channel": null
                                            }
                                        }
                                    };
                                    robloxdata.guilds.push(guildJSON);
                                }
                                guildJSON.requesting = interaction.user.id;
                                guildJSON.ready = false;
                                await writeFileAsync(robloxdata, "roblox-data.json");

                                await channel.send({
                                    embeds: [embed],
                                    components: [buttonRow]
                                });

                                await interaction.reply({
                                    content: "Request has been sent to the owner. Please keep an eye on your DMs because the bot will tell you the result there."
                                })
                            } catch (e) {
                                await interaction.reply({
                                    content: "Something went wrong getting all data. Please check your input and try again.",
                                    ephemeral: true
                                });
                                console.error(e);
                            }
                        } else {
                            return await interaction.reply({
                                content: "You do not have the required permissions to setup the bot. You require rank 250 or above in the Roblox Group to setup the bot."
                            });
                        }
                    } else {
                        return await interaction.reply({
                            content: "You are not in the provided Roblox group.\n\nYou need to join the group and have the required permissions to setup the bot."
                        })
                    }
                } else {
                    return await interaction.reply({
                        content: "You are not verified. Please verify with /verify to use this command.",
                        ephemeral: true
                    });
                }
            } else {
                return await interaction.reply({
                    content: "You are not verified. Please verify with /verify to use this command.",
                    ephemeral: true
                });
            }
        }
    },
};