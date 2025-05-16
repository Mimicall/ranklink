const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const { getIdFromUsername } = require("../../roblox-api.js");
const { readFileAsync, writeFileAsync } = require("../../filesystem.js");

let verifyButton = new ButtonBuilder()
    .setCustomId("verify")
    .setStyle(ButtonStyle.Success)
    .setLabel("Press when done!");

let verifyRow = new ActionRowBuilder()
    .addComponents(verifyButton);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("verify")
        .setDescription("Verify your Roblox Account with your Discord Account.")
        .addStringOption(option => 
            option
                .setName("username")
                .setDescription("Your Roblox username.")
                .setRequired(true)
        ),
    async execute(interaction, client) {
        let username = interaction.options.getString("username");
        let robloxdata = await readFileAsync("roblox-data.json");

        if (robloxdata) {
            let user = robloxdata.users.find(obj => obj.discord.id == interaction.user.id);
            if (user) {
                if (user.verified == "yes") {
                    return await interaction.reply({ content: "You are already verified.", ephemeral: true });
                } else {
                    user.roblox.username = username;
                    let newId = await getIdFromUsername(username);
                    if (newId) {
                        user.roblox.id = newId 
                    } else {
                        return await interaction.reply({content: "Couldn't find Roblox Username. Please check your input and try again.", ephemeral: true });
                    }
                    await writeFileAsync(robloxdata, "roblox-data.json");
                    await startVerify(interaction);
                }
            }
            else {
                user = {
                    "verified": "no",
                    "discord": {
                        "name": interaction.user.username,
                        "id": interaction.user.id
                    },
                    "roblox": {
                        "username": username,
                        "id": null
                    }
                };
                let newId = await getIdFromUsername(username);
                if (newId) {
                    user.roblox.id = newId
                } else {
                    return await interaction.reply({ content: "Couldn't find Roblox Username. Please check your input and try again.", ephemeral: true });
                }
                robloxdata.users.push(user);
                await writeFileAsync(robloxdata, "roblox-data.json");
                await startVerify(interaction);
            }
        } else {
            await interaction.reply({ content: "Error retreiving data. Please try again later.", ephemeral: true });
            console.error("Failed to retreive Roblox Data.");
        }
    }
}

async function startVerify(interaction) {
    let robloxdata = await readFileAsync("roblox-data.json");
    let wordList = robloxdata.verifyCAPTCHA;

    if (robloxdata) {
        let user = robloxdata.users.find(obj => obj.discord.id == interaction.user.id);

        if (user) {
            user.verified = "pending";
            let words = [];
            for (let i = 0; i < 7; i++) {
                let word = wordList[getRandomInt(0, wordList.length)];
                words.push(word);
            }
            let phrase = words.join(" ");
            user.phrase = phrase;
            await writeFileAsync(robloxdata, "roblox-data.json");
            await interaction.reply({ 
                content: `Please put the following phrase in your Roblox Description:\n\n**${phrase}**\n\nPress the verify button when you are done.`, 
                components: [verifyRow],
                ephemeral: true 
            });
        }
    } else {
        await interaction.reply({ content: "Error retreiving data. Please try again later.", ephemeral: true });
        console.error("Failed to retreive Roblox Data.");
    }
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}