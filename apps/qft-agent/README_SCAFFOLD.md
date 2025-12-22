QFT Agent - Feature Scaffold

This file summarizes the scaffolding implemented:

- `utils/ConfigManager.js`: per-guild config store with `set`, `get`, `rollback`, and `isCategoryEnabled`.
- `utils/logger.js`: small structured logger.
- `modules/automod.js`: basic automod (link/caps/spam) with per-guild toggle `categories.automod`.
- `modules/tickets.js`: ticket creation & close with transcript export.
- `events/guildMemberAdd.js` & `events/guildMemberRemove.js`: templated welcome/leave messages using `welcome` / `leave` config keys.
- `commands/admin/embed.js`: `/embed post` and `/embed schedule` to create embeds and schedule postings.
- `commands/admin/schedule.js`: `/schedule list|remove` to manage scheduled embed jobs.
- `commands/admin/custom.js`: `/custom create|delete` for per-guild custom text commands (stored in `customCommands`) with optional `cooldown` (seconds) and `role` restriction.
- `commands/admin/ticket.js`: `/ticket create|close` to manage tickets.
- `adapters/DiscordAdapter.js`: login with exponential backoff and heartbeat monitoring (scheduler service initialized on ready).
- `events/messageCreate.js` enhanced to run Automod and service message-based custom commands using guild `prefix` (default `!`). Custom commands now enforce cooldowns and role restrictions.

Quick start:

1. Ensure `.env` has `BOT_TOKEN`, `CLIENT_ID`, `GUILD_ID` for dev deployment.
2. Run `node src/deploy-commands.js` to register slash commands to the test guild.
3. Start the bot (e.g., `node src/AgentCore.js`).

Next steps (optional):
- Add tests for ConfigManager and Automod logic.
- Implement scheduler for embeds and permission checks for ticket creation.
- Add cooldowns/role restrictions to custom commands.
- Add UI in `qft-app` to edit guild configs via internal API.
