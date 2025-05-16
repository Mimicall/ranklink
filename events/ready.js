const { Events } = require('discord.js');
require("dotenv").config();
const noblox = require("noblox.js");
const ROBLOX_COOKIE = process.env.ROBLOX_COOKIE;

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		await noblox.setCookie(ROBLOX_COOKIE);
		console.log(`Ready! Logged in as ${client.user.tag}`);
    }
};