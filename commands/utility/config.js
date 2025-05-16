const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const { getRoles, getRole } = require("../../roblox-api.js");
const { readFileAsync, writeFileAsync, makeConfigEmbed } = require("../../filesystem.js");

const requestRoleTemplate = {
    "roblox": {
        "name": null,
        "rankId": null,
        "roleSetId": null
    },
    "discordRole": null
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("config")
        .setDescription("Options for configurating the bot.")
        .addSubcommand(subcommand =>
            subcommand
                .setName("display")
                .setDescription("Display the current configuration settings.")
        )
        .addSubcommandGroup(group =>
            group
                .setName("requestrole")
                .setDescription("Options to connect/disconnect roles with group ranks.")
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("add")
                        .setDescription("Connect a role.")
                        .addRoleOption(option =>
                            option
                                .setName("role")
                                .setDescription("Discord role to add.")
                                .setRequired(true))
                        .addStringOption(option =>
                            option
                                .setName("rank")
                                .setDescription("Roblox group rank to add.")
                                .setRequired(true)
                                .setAutocomplete(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("remove")
                        .setDescription("Disconnect a role.")
                        .addRoleOption(option =>
                            option
                                .setName("role")
                                .setDescription("role to remove.")
                                .setRequired(true))
                )
        )
        .addSubcommandGroup(group =>
            group
                .setName("staff")
                .setDescription("Options to add and remove roles for moderating requests.")
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("add")
                        .setDescription("Add a role.")
                        .addRoleOption(option =>
                            option
                                .setName("role")
                                .setDescription("Role to add.")
                                .setRequired(true)),
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("remove")
                        .setDescription("Remove a role.")
                        .addRoleOption(option =>
                            option
                                .setName("role")
                                .setDescription("Role to remove.")
                                .setRequired(true)),
                )
        )
        .addSubcommandGroup(group =>
            group
                .setName("log")
                .setDescription("Options for logging requests upon completion.")
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("channel")
                        .setDescription("Channel to log requests.")
                        .addChannelOption(option =>
                            option
                                .setName("channel")
                                .setDescription("Channel for logging.")
                                .setRequired(true)),
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("disable")
                        .setDescription("Disable logging requests")
                )
        )
        .addSubcommandGroup(group =>
            group
                .setName("applications")
                .setDescription("Options for how applications are handled.")
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("mode")
                        .setDescription("Set whether rank applications are handled automatically or require manual approval by staff.")
                        .addStringOption(option =>
                            option
                                .setName("type")
                                .setDescription("Choose how applications are handled")
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Automatic', value: 'automatic' },
                                    { name: 'Manual', value: 'manual' }
                                )),
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("requestchannel")
                        .setDescription("Channel where new requests are sent if mode is manual.")
                        .addChannelOption(option =>
                            option
                                .setName("channel")
                                .setDescription("Channel for new requests")
                                .setRequired(true)
                        )
                )
        ),
    async autocomplete(interaction, client) {
        let robloxdata = await readFileAsync("roblox-data.json");
        let finalResponse = [];
        let focusedOption = interaction.options.getFocused(true);
        if (interaction.options.getSubcommandGroup(false) == "requestrole") {
            if (interaction.options.getSubcommand() == "add") {
                if (focusedOption.name == "rank") {
                    let guild = robloxdata.guilds.find(obj => obj.guild.id == interaction.guildId);
                    if (guild) {
                        let roles = await getRoles(guild.group.id);
                        let choices = [];
                        for (let role of roles) {
                            choices.push(role.name);
                        }
                        finalResponse = choices.filter(choice =>
                            choice.includes(focusedOption.value)
                        );
                    }
                }
            }
        }
        await interaction.respond(
            finalResponse.map(choice => ({ name: choice, value: choice }))
        );
    },
    async execute(interaction, client) {
        let robloxdata = await readFileAsync("roblox-data.json");
        let user = robloxdata.users.find(obj => obj.discord.id == interaction.user.id);
        if (!user || user.verified != "yes") return await interaction.reply({
            content: "❌ You must be verified before using this command. Please run `/verify` to continue.",
            ephemeral: true
        });
        let guild = robloxdata.guilds.find(obj => obj.guild.id == interaction.guildId);
        if (!guild || !guild.ready) return await interaction.reply({
            content: "❌ This server hasn't been set up yet. Please run `/setup` and wait for approval before using this command.",
            ephemeral: true
        });
        let subGroup = interaction.options.getSubcommandGroup(false);
        let subcommand = interaction.options.getSubcommand();
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return await interaction.reply({
            content: "❌ You need the **Manage Server** permission to use this command.",
            ephemeral: true
        });
        if (subGroup == "requestrole") {
            if (subcommand == "add") {
                let role = interaction.options.getRole("role");
                let rank = interaction.options.getString("rank");
                let roleInfo = await getRole(guild.group.id, rank);
                let requestRoleArray = guild.config.requestRoles;
                if (!roleInfo) return await interaction.reply({
                    content: "❌ That Roblox rank couldn't be found. Please check the rank name — it's case-sensitive."
                });
                if (requestRoleArray.some(obj => obj.roblox.name == rank.toLowerCase())) return await interaction.reply({
                    content: "❌ This Roblox rank is already linked to another Discord role in the configuration.",
                    ephemeral: true
                });
                if (requestRoleArray.some(obj => obj.discordRole == role.id)) return await interaction.reply({
                    content: `❌ This Discord role is already connected to a Roblox rank.`,
                    ephemeral: true
                });

                let newRequestRole = requestRoleTemplate;
                newRequestRole.roblox.name = roleInfo.name;
                newRequestRole.roblox.rankId = roleInfo.rank;
                newRequestRole.roblox.roleSetId = roleInfo.id;
                newRequestRole.discordRole = role.id;

                requestRoleArray.push(newRequestRole);
                await writeFileAsync(robloxdata, "roblox-data.json");

                return await interaction.reply({
                    content: "✅ The role has been successfully linked to the selected Roblox rank.",
                    ephemeral: true
                });
            } else if (subcommand == "remove") {
                let role = interaction.options.getRole("role");
                let requestRoleArray = guild.config.requestRoles;
                let reqRole = requestRoleArray.findIndex(obj => obj.discordRole == role.id);
                if (reqRole === -1) return await interaction.reply({
                    content: "❌ This Discord role isn't currently linked to any Roblox rank.",
                    ephemeral: true
                });

                requestRoleArray.splice(reqRole, 1);
                await writeFileAsync(robloxdata, "roblox-data.json");

                return await interaction.reply({
                    content: "✅ The role has been successfully removed from the configuration.",
                    ephemeral: true
                });
            }
        } else if (subGroup == "staff") {
            if (subcommand == "add") {
                let role = interaction.options.getRole("role");
                let staffArray = guild.config.staffRoles;
                if (staffArray.some(obj => obj == role.id)) return await interaction.reply({
                    content: "❌ This role is already listed as a staff role.",
                    ephemeral: true
                });

                staffArray.push(role.id);
                await writeFileAsync(robloxdata, "roblox-data.json");

                return await interaction.reply({
                    content: "✅ The role has been successfully added as a staff role.",
                    ephemeral: true
                });
            } else if (subcommand == "remove") {
                let role = interaction.options.getRole("role");
                let staffArray = guild.config.staffRoles;
                let staffIndex = staffArray.findIndex(obj => obj == role.id);
                if (!staffIndex) return await interaction.reply({
                    content: `❌ This role isn't in the current staff role list.`,
                    ephemeral: true
                });

                delete staffArray[staffIndex];
                staffArray = staffArray.filter(obj => obj !== null);
                await writeFileAsync(robloxdata, "roblox-data.json");

                return await interaction.reply({
                    content: `✅ The role has been successfully removed from the staff role list.`,
                    ephemeral: true
                });
            }
        } else if (subGroup == "log") {
            if (subcommand == "channel") {
                let channel = interaction.options.getChannel("channel");
                guild.config.logchannel = channel.id;
                await writeFileAsync(robloxdata, "roblox-data.json");

                return await interaction.reply({
                    content: "✅ The log channel has been successfully set.",
                    ephemeral: true
                });
            } else if (subcommand == "disable") {
                guild.config.logchannel = null;
                await writeFileAsync(robloxdata, "roblox-data.json");

                return await interaction.reply({
                    content: "✅ Logging has been successfully disabled.",
                    ephemeral: true
                });
            }
        } else if (subGroup == "applications") {
            if (subcommand == "mode") {
                let type = interaction.options.getString("type");
                if (type != "automatic" && type != "manual") return await interaction.reply({
                    content: "❌ Invalid mode. Please select either **automatic** or **manual**.",
                    ephemeral: true
                });

                guild.config.requestSettings.mode = type;
                await writeFileAsync(robloxdata, "roblox-data.json");

                return await interaction.reply({
                    content: "✅ The application handling mode has been updated successfully.",
                    ephemeral: true
                });
            } else if (subcommand == "requestchannel") {
                let channel = interaction.options.getChannel("channel");
                guild.config.requestSettings.channel = channel.id;
                await writeFileAsync(robloxdata, "roblox-data.json");

                return await interaction.reply({ 
                    content: "✅ The request channel has been successfully updated.",
                    ephemeral: true
                });
            }
        } else {
            let embed = await makeConfigEmbed(guild.config);

            return await interaction.reply({
                embeds: [embed]
            });
        }
    },
};