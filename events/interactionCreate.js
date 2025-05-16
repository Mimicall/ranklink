const { Events, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');
const { getUserData, checkBotPermissions, setUserRankInGroup } = require("../roblox-api.js");
const { writeFileAsync, readFileAsync, makeLogAppAcceptEmbed, makeLogAppRejectEmbed } = require("../filesystem.js");

let logAcceptTemplate = {
	user: null,
	oldRoblox: null,
	oldDiscord: null,
	newRoblox: null,
	newDiscord: null,
	acceptedBy: null,
	username: null
}

let logRejectTemplate = {
	user: null,
	currentRoblox: null,
	currentDiscord: null,
	requestedRoblox: null,
	requestedDiscord: null,
	rejectedBy: null,
	reason: null,
	username: null
}

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				console.log(`${interaction.user.globalName} used ${interaction.commandName}`)
				await command.execute(interaction, interaction.client);
			} catch (error) {
				console.error(error);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
				} else {
					await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
				}
			}
		} else if (interaction.isAutocomplete()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.autocomplete(interaction, interaction.client);
			} catch (error) {
				console.error(error);
			}
		}
		else if (interaction.isContextMenuCommand()) {
			console.log(`${interaction.user.globalName} used ${interaction.commandName}`);
			await interaction.deferReply({ ephemeral: true });
			const command = interaction.client.commands.get(interaction.commandName);
			if (!command) return;

			try {
				await command.execute(interaction, interaction.client);
			} catch (error) {
				console.error(error);
				await interaction.reply({ content: 'There was an error while executing this context menu command!', ephemeral: true });
			}
		}
		else if (interaction.isButton()) {
			if (interaction.customId == "verify") {
				let robloxData = await readFileAsync("roblox-data.json");

				if (robloxData) {
					let user = robloxData.users.find(obj => obj.discord.id == interaction.user.id);
					if (user) {
						if (user.verified == "yes") {
							return await interaction.reply({ content: "You are already verified!", ephemeral: true })
						} else {
							let userData = await getUserData(user.roblox.id);

							if (userData) {
								if (userData.description.toLowerCase().includes(user.phrase.toLowerCase())) {
									delete user.phrase;
									user.verified = "yes";

									await writeFileAsync(robloxData, "roblox-data.json");
									return await interaction.reply({ content: "You have successfully verified!", ephemeral: true });
								} else {
									return await interaction.reply({ content: "Roblox Description didn't match verification phrase. Please try again.", ephemeral: true })
								}
							} else {
								return await interaction.reply({ content: "Couldn't find Roblox User! Please try again with a valid username." });
							}
						}
					}
				} else {
					await interaction.reply({ content: "Error retreiving data. Please try again later.", ephemeral: true });
					console.error("Failed to retreive Roblox Data.");
				}
			} else if (interaction.customId == "complete") {
				let embed = interaction.message.embeds[0];
				if (embed && embed.footer) {
					let userId = embed.footer.text;

					let robloxdata = await readFileAsync("roblox-data.json");

					let guild = robloxdata.guilds.find(obj => obj.requesting == userId);

					if (guild) {
						delete guild.requesting;
						guild.ready = true;

						await writeFileAsync(robloxdata, "roblox-data.json");
						let userDm = await interaction.client.users.fetch(userId);

						userDm.send({
							content: '**The owner has completed your request!**\n\nPlease check your Roblox group and look for the user "RBLXGroupManagerBot" and give them the required permissions to start managing the group!\n\nThanks for using the bot!'
						});

						const updatedEmbed = EmbedBuilder.from(embed)
							.setColor('#00D166');

						await interaction.update({
							embeds: [updatedEmbed],
							components: []
						});
					}
				}
			} else if (interaction.customId == "deny") {
				let embed = interaction.message.embeds[0];
				if (embed && embed.footer) {
					let modal = new ModalBuilder()
						.setCustomId(`denyReq`)
						.setTitle("Specify Deny Reason");

					let reasonInput = new TextInputBuilder()
						.setCustomId("reasonInput")
						.setLabel("Reason")
						.setPlaceholder("Reason for deny...")
						.setStyle(TextInputStyle.Paragraph)
						.setRequired(true);

					let firstActionRow = new ActionRowBuilder().addComponents(reasonInput);
					modal.addComponents(firstActionRow);

					await interaction.showModal(modal);
				}
			} else if (interaction.customId == "accept") {
				let robloxdata = await readFileAsync("roblox-data.json");
				let user;
				let guild;
				try {
					console.log(interaction);
					let embed = interaction.message.embeds[0];
					if (embed) {
						let robloxuserId = embed.fields[2].value;
						let logTemplate = logAcceptTemplate;

						user = robloxdata.users.find(obj => obj.roblox.id == robloxuserId);
						let userId = user.discord.id;
						logTemplate.username = user.roblox.username;
						logTemplate.user = userId;
						logTemplate.acceptedBy = interaction.user.id;

						guild = robloxdata.guilds.find(obj => obj.guild.id == interaction.guildId);

						// Attempt to change the user's role in the Discord server and Roblox group
						const role = guild.config.requestRoles.find(obj => obj.roblox.name === embed.fields[4].value);

						if (!role) {
							await interaction.reply("Failed to find the requested role in the configuration.");
							return;
						}

						if (!await checkBotPermissions(guild.group.id)) {
							await interaction.reply("I don't have the necessary permissions to change your rank in the group. Please notify the staff to fix this issue.");
							return;
						}

						// Change the user's rank in the Roblox group
						await setUserRankInGroup(guild.group.id, robloxuserId, role.roblox.name);

						logTemplate.newRoblox = role.roblox.name;
						logTemplate.newDiscord = role.discordRole;

						// Assign the corresponding Discord role
						const discordRole = interaction.guild.roles.cache.get(role.discordRole);
						if (discordRole) {
							const member = await interaction.guild.members.fetch(userId);

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
						}

						let userDm = await interaction.client.users.fetch(userId);

						userDm.send({
							content: '**Your Request has been accepted.**'
						});

						const updatedEmbed = EmbedBuilder.from(embed)
							.setColor('#00D166');

						await interaction.update({
							embeds: [updatedEmbed],
							components: []
						});

						if (guild.config.logchannel) {
							let logChannel = await interaction.client.channels.fetch(guild.config.logchannel);
							if (logChannel) {
								const logEmbed = await makeLogAppAcceptEmbed(logTemplate);
								await logChannel.send({ embeds: [logEmbed] });
							} else {
								console.error("Failed to find log channel.");
							}
						}
					}
				} catch (error) {
					console.error("Error updating rank:", error);
					await interaction.reply("There was an error while processing your rank application.");
				}
			} else if (interaction.customId == "reject") {
				let embed = interaction.message.embeds[0];
				if (embed) {
					let modal = new ModalBuilder()
						.setCustomId(`rejectReq`)
						.setTitle("Specify Deny Reason");

					let reasonInput = new TextInputBuilder()
						.setCustomId("reasonInput")
						.setLabel("Reason")
						.setPlaceholder("Reason for deny...")
						.setStyle(TextInputStyle.Paragraph)
						.setRequired(false);

					let firstActionRow = new ActionRowBuilder().addComponents(reasonInput);
					modal.addComponents(firstActionRow);

					await interaction.showModal(modal);
				}
			}
		}
		else if (interaction.isModalSubmit()) {
			if (interaction.customId == "denyReq") {
				let embed = interaction.message.embeds[0];
				if (embed && embed.footer) {
					let userId = embed.footer.text;
					let reason = interaction.fields.getTextInputValue("reasonInput");

					let robloxdata = await readFileAsync("roblox-data.json");

					let guild = robloxdata.guilds.find(obj => obj.requesting == userId);

					if (guild) {
						delete guild.requesting;
						guild.ready = false;

						await writeFileAsync(robloxdata, "roblox-data.json");
					}
					let userDm = await interaction.client.users.fetch(userId);

					userDm.send({
						content: `**The owner has denied your request.**\n\n**Reason:** ${reason}`
					});

					const updatedEmbed = EmbedBuilder.from(embed)
						.setColor('#E02929');

					await interaction.update({
						embeds: [updatedEmbed],
						components: []
					});
				}
			} else if (interaction.customId == "rejectReq") {
				let embed = interaction.message.embeds[0];
				if (embed) {
					let logTemplate = logRejectTemplate;
					logTemplate.rejectedBy = interaction.user.id;
					let robloxuserId = embed.fields[2].value;
					let reason = interaction.fields.getTextInputValue("reasonInput") || "No reason provided.";
					logTemplate.reason = reason;

					let robloxdata = await readFileAsync("roblox-data.json");

					let user = robloxdata.users.find(obj => obj.roblox.id == robloxuserId);
					let guild = robloxdata.guilds.find(obj => obj.guild.id == interaction.guildId);
					let userId = user.discord.id;
					logTemplate.user = userId;
					logTemplate.username = user.roblox.username;

					// Attempt to change the user's role in the Discord server and Roblox group
					const role = guild.config.requestRoles.find(obj => obj.roblox.name === embed.fields[4].value);

					let userDm = await interaction.client.users.fetch(userId);
					logTemplate.requestedDiscord = role.discordRole;
					logTemplate.requestedRoblox = role.roblox.name;

					const member = await interaction.guild.members.fetch(userId);

					// Check if the user already has a role in the requestRoles and remove it
					const existingRole = guild.config.requestRoles.find(r => member.roles.cache.has(r.discordRole));
					if (existingRole) {
						logTemplate.currentDiscord = existingRole.discordRole;
						logTemplate.currentRoblox = existingRole.roblox.name;
					}
					userDm.send({
						content: `**Your request has been denied.**\n\n**Reason:** ${reason}`
					});

					const updatedEmbed = EmbedBuilder.from(embed)
						.setColor('#E02929');

					await interaction.update({
						embeds: [updatedEmbed],
						components: []
					});

					if (guild.config.logchannel) {
						let logChannel = await interaction.client.channels.fetch(guild.config.logchannel);
						if (logChannel) {
							const logEmbed = await makeLogAppRejectEmbed(logTemplate);
							await logChannel.send({ embeds: [logEmbed] });
						} else {
							console.error("Failed to find log channel.");
						}
					}
				}
			}
		}
		else if (interaction.isStringSelectMenu()) {

		}
	},
};