# RankLink

A Discord bot to seamlessly manage Roblox group rank applications, synchronize Roblox group ranks with Discord roles, and streamline moderation workflows — all in one bot.

---

## Features

* **Roblox Group Rank Sync:** Automatically connect Roblox group ranks with Discord roles to assign and manage roles easily.
* **Rank Application System:** Handle rank applications with configurable modes — automatic or manual staff approval.
* **Role Management:** Add and remove staff roles responsible for moderating rank requests.
* **Request Logging:** Log all rank requests and actions to a designated Discord channel for transparency.
* **Configurable via Slash Commands:** Easy to set up and manage directly through Discord slash commands.

---

## Installation

Invite the bot to your discord server with this link:
https://discord.com/oauth2/authorize?client_id=1371422603331239976&scope=bot+applications.commands+identify&permissions=277293911040

---

## Usage

### Commands

* `/config display` — View the current bot configuration.
* `/config requestrole add` — Connect a Discord role to a Roblox group rank.
* `/config requestrole remove` — Disconnect a role from rank syncing.
* `/config staff add/remove` — Manage staff roles who moderate rank requests.
* `/config log channel` — Set the channel for logging rank request activities.
* `/config log disable` — Disable request logging.
* `/config applications mode` — Set application mode (automatic/manual).
* `/config applications requestchannel` — Set the channel where manual requests are sent.

### Application Flow

* Users apply for rank changes via `/apply`.
* The bot processes requests based on the configured mode:

  * **Automatic:** Bot automatically assigns ranks based on applications.
  * **Manual:** Staff review and approve requests via Discord channels.

---

## Contributing

Contributions and suggestions are welcome! Feel free to open issues or pull requests.

---

## License

This project is licensed under the MIT License.

---

## Support

For help or questions, open an issue or join our Discord server https://discord.gg/FaQmxHxPM5.
