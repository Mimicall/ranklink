const fs = require("fs").promises;
const { EmbedBuilder } = require("discord.js");

async function writeFileAsync(data, fileName) {
    try {
        await fs.writeFile(fileName, JSON.stringify(data, null, 2), 'utf-8', (err) => {
            if (err) {
                console.error('Error writing to file', err);
            } else {
                console.log('Data saved to file');
            }
        });
    } catch(e) {
        console.error(e);
    }
    
}

async function readFileAsync(fileName) {
    try {
        const rawData = await fs.readFile(fileName);
        let jsonData = await JSON.parse(rawData);
        return jsonData;
    } catch(e) {
        console.error(e);
    }
}

async function makeGroupJoinEmbed(requesterName, requesterIcon, requesterId, groupURL, 
    guildName, guildId, guildMembers, 
    groupName, groupId, groupMembers,
    robloxName, robloxRankName, robloxRank) {
    let color = 0x0099FF;
    let title = "New Join Request!";
    const exampleEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setURL(groupURL)
        .setAuthor({ name: requesterName, iconURL: requesterIcon})
        .addFields(
            { name: "Guild name:", value: guildName, inline: true },
            { name: "Guild Id:", value: guildId, inline: true },
            { name: "Guild Member Count:", value: guildMembers, inline: true },
            { name: "Group Name:", value: groupName, inline: true },
            { name: "Group Id:", value: groupId, inline: true },
            { name: "Group Member Count:", value: groupMembers, inline: true },
            { name: "Roblox Username:", value: robloxName, inline: true },
            { name: "Group Rank Name:", value: robloxRankName, inline: true },
            { name: "Group Rank Number:", value: robloxRank, inline: true },
        )
        .setTimestamp()
        .setFooter({ text: requesterId});

    return exampleEmbed;
}

async function makeRequestEmbed(requestObj) {
    let color = 0x0099FF;
    let title = "New Rank Request!";
    const exampleEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .addFields(
            { name: "User", value: `<@${requestObj.user}>`, inline: true },
            { name: "Roblox Username", value: requestObj.username, inline: true },
            { name: "Roblox User ID", value: requestObj.userId.toString(), inline: true },
            { name: "Current Role", value: requestObj.currentRole, inline: true },
            { name: "Requested Role", value: requestObj.requestedRole, inline: true },
            { name: "Date Submitted", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
        )
        .setTimestamp()

    return exampleEmbed;
}

async function makeConfigEmbed(configObj) {
    let color = 0x0099FF;
    let title = "Configuration";
    let roleArray = configObj.requestRoles.length == 0 ? ["none"] : [];
    let rankArray = configObj.requestRoles.length == 0 ? ["none"] : [];
    let idArray = configObj.requestRoles.length == 0 ? ["none"] : [];
    for (let role of configObj.requestRoles) {
        roleArray.push(`<@&${role.discordRole}>`);
        rankArray.push(role.roblox.name);
        idArray.push(role.roblox.rankId);
    }
    let staff = configObj.staffRoles.length == 0 ? ["none"] : [];
    for (let role of configObj.staffRoles) {
        staff.push(`<@&${role}>`);
    }
    let logchannel = configObj.logchannel != null ? `<#${configObj.logchannel}>` : "none";
    let requestChannel = configObj.requestSettings.channel != null ? `<#${configObj.requestSettings.channel}>` : "none";
    const exampleEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription("Below is the current config setup for the server.")
        .addFields(
            { name: "Discord Role", value: roleArray.join("\n"), inline: true },
            { name: "Group Rank", value: rankArray.join("\n"), inline: true },
            { name: "Rank Value", value: idArray.join("\n"), inline: true },
            { name: "Staff", value: staff.join("\n"), inline: true },
            { name: "Log Channel", value: logchannel, inline: true },
            { name: "Request Channel", value: requestChannel, inline: true },
        )
        .setTimestamp()

    return exampleEmbed;
}

async function makeLogAppAcceptEmbed(logObj) {
    let color = "#00D166";
    let title = "Application Accepted";
    const exampleEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .addFields(
            { name: "User", value: `<@${logObj.user}>`, inline: true },
        )
        .setTimestamp()
    
    if (logObj.oldDiscord) {
        exampleEmbed.addFields(
            { name: "Old Role", value: `${logObj.oldRoblox} (<@&${logObj.oldDiscord}>)`, inline: true },
        )
    } else {
        exampleEmbed.addFields(
            { name: "Old Role", value: `none`, inline: true },
        )
    }
    exampleEmbed.addFields(
        { name: "New Role", value: `${logObj.newRoblox} (<@&${logObj.newDiscord}>)`, inline: true },
        { name: "Roblox Username", value: logObj.username, inline: true },
    )
    if (logObj.acceptedBy) {
        exampleEmbed.addFields(
            { name: "Accepted By", value: `<@${logObj.acceptedBy}>`, inline: true },
        )
    }
    exampleEmbed.addFields(
        { name: "Date of change", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
    )

    return exampleEmbed;
}

async function makeLogAppRejectEmbed(logObj) {
    let color = "#E02929";
    let title = "Application Rejected";
    const exampleEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .addFields(
            { name: "User", value: `<@${logObj.user}>`, inline: true },
        )
        .setTimestamp()
    
    if (logObj.currentDiscord) {
        exampleEmbed.addFields(
            { name: "Current Role", value: `${logObj.currentRoblox} (<@&${logObj.currentDiscord}>)`, inline: true },
        )
    } else {
        exampleEmbed.addFields(
            { name: "Current  Role", value: `none`, inline: true },
        )
    }
    exampleEmbed.addFields(
        { name: "Requested Role", value: `${logObj.requestedRoblox} (<@&${logObj.requestedDiscord}>)`, inline: true },
        { name: "Roblox Username", value: logObj.username, inline: true },
    )
    if (logObj.rejectedBy) {
        exampleEmbed.addFields(
            { name: "Rejected By", value: `<@${logObj.rejectedBy}>`, inline: true },
        )
    }
    exampleEmbed.addFields(
        { name: "Rejection Reason", value: logObj.reason, inline: false },
        { name: "Date of change", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
    )

    return exampleEmbed;
}

module.exports = {
    readFileAsync,
    writeFileAsync,
    makeGroupJoinEmbed,
    makeConfigEmbed,
    makeRequestEmbed,
    makeLogAppAcceptEmbed,
    makeLogAppRejectEmbed
}