# Copilot Instructions for QFT Ecosystem

## Project Overview
- **Monorepo** with multiple apps: `qft-app` (React/Vite frontend), `qft-agent` (Node.js Discord bot), `qft-api-gateway` (Express API gateway), and `qft-landing` (static marketing site).
- Each app has its own `package.json` and may have unique build/test/dev workflows.

## Architecture & Data Flow
- **qft-app**: React (Vite) SPA for account management and admin, modularized by feature in `src/components/modules/`. Uses context providers for user/session state. Communicates with backend via REST and websockets.
- **qft-agent**: Discord bot, entrypoint `src/AgentCore.js`. Modular command/event structure. Integrates with MongoDB, uses `discord.js` and custom modules in `src/modules/`.
- **qft-api-gateway**: Express server, entrypoint `index.js`. Handles API routing, websockets, Redis, and PostgreSQL. Integrates with Discord bot and frontend.
- **qft-landing**: Static HTML/CSS/JS site, no backend. Uses Bulma CSS and custom scripts for dynamic UI.

## Developer Workflows
- **Monorepo scripts** (root `package.json`):
  - `npm run dev` — Launches all main apps in dev mode (except landing, which uses `npm run landing`).
  - `npm run start` — Starts all main apps for production.
  - `npm run landing` — Serves the static landing site on port 8000.
- **qft-app**:
  - `npm run dev` — Vite dev server (hot reload).
  - `npm run build` — Production build.
  - `npm run test` — Runs Vitest tests.
- **qft-agent**:
  - `npm run dev` — Nodemon for live Discord bot reload.
  - `npm run start` — Launches bot.
- **qft-api-gateway**:
  - `npm run dev` — Nodemon for API gateway.
  - `npm run start` — Launches API gateway.

## Project-Specific Patterns & Conventions
- **Frontend modules**: Each feature (e.g., permissions, automod, analytics) is a self-contained React module in `src/components/modules/`. Shared UI in `src/components/elements/`.
- **Role/permission logic**: See `PermissionsModule.jsx` and `RolePermissionManagerModule.jsx` for role-based access patterns. Permissions are grouped by category and toggled per role.
- **AI/automation modules**: AI-related modules are in `src/components/modules/ai-modules/` and are listed in `ModuleList.jsx`.
- **Backend commands/events**: Discord bot commands/events are organized by domain in `src/commands/` and `src/events/`.
- **API integration**: API gateway mediates between frontend and bot, using REST and websockets. See `qft-api-gateway/src/routes/`.

## Integration Points
- **Discord**: Bot integration via `discord.js` in `qft-agent`.
- **Database**: MongoDB (bot), PostgreSQL (API gateway), Redis (socket adapter).
- **Websockets**: Used for real-time updates between frontend and backend.
- **External services**: Google Forms, Widgetbot (Discord widget), social media embeds (landing site).

## Examples
- To add a new admin module: create a new file in `qft-app/src/components/modules/`, export a React component, and add it to the module grid/sidebar.
- To add a Discord command: add a JS file to `qft-agent/src/commands/` and register it in `deploy-commands.js`.

## References
- See each app's `README.md` for more details.
- Key files: `qft-app/src/components/modules/PermissionsModule.jsx`, `qft-agent/src/AgentCore.js`, `qft-api-gateway/index.js`, `qft-landing/README.md`.

---
For more, see https://aka.ms/vscode-instructions-docs
