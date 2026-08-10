# AGENTS.md - Instructions and Context for AI Coding Assistants

Read this file first when working in this repository. It is the shortest reliable summary of the app, the architecture, and the rules that matter during implementation.

## Project Overview

Side Effects Boardgame is a browser-based multiplayer card game for local or online play. The current codebase is a single full-stack TypeScript project with a React client, a Socket.IO server, optional Supabase persistence, and a shared game engine.

## Architecture

- `src/` contains the client app, game engine, audio, localization, and tests.
- `server/` contains the HTTP entrypoint, Socket.IO handlers, room service, session security, persistence adapters, and server tests.
- `supabase/` contains optional migration files for durable room storage.
- `dist/` and `dist-server/` are build outputs.

Core flow:

1. The client renders the current game state from the shared store.
2. The client sends gameplay commands to the server.
3. The server validates commands in `RoomService` and applies game rules through the engine.
4. The server broadcasts the updated room state back to connected clients.

## Important Rules

- The server is the source of truth for multiplayer rooms and game state.
- Never assume the client can safely mutate game state by itself.
- Keep secret or room-specific data on the server until it is intentionally sent to the correct player.
- Public log entries must not leak hidden information.
- Room snapshots may be stored in memory or in Supabase, depending on configuration.

## Game Logic Notes

- The shared engine lives in `src/game/engine/`.
- Card definitions live in `src/game/cards/`.
- Turn actions, discard handling, and end-of-turn rules are enforced in the engine and mirrored by server command validation.
- If you change a command or card rule, update the engine, the socket command types, and the tests together.

## UI Notes

- UI text should remain Vietnamese unless the task explicitly requires otherwise.
- Card interactions should stay consistent across desktop and mobile.
- Keep the main board usable without forcing repeated scrolling when a compact layout is requested.
- Validation failures should surface clearly in the interface, usually through the existing popup or error state.

## Coding Conventions

- Use English for code identifiers.
- Keep comments short and only for non-obvious logic.
- Prefer small functions with one responsibility.
- Do not add a new abstraction unless it simplifies an actual repeated pattern.

## Working Rules

- Use `apply_patch` for manual file edits.
- Do not commit unless the user explicitly asks for a commit.
- Do not revert or overwrite unrelated user changes.
- Prefer `rg` for text and file searches.
- Run the relevant tests and a production build before handing off a change that affects gameplay, UI layout, or server behavior.

## Verification Commands

- `npm run test`
- `npm run build`
- `npm run lint`

## Key Files

- `src/pages/App.tsx`
- `src/components/GameBoard.tsx`
- `src/store/gameStore.ts`
- `src/game/engine/`
- `server/app.ts`
- `server/rooms/roomService.ts`
- `server/socket/registerSocketHandlers.ts`
- `supabase/migrations/001_initial.sql`

## Git Policy

- Keep commits focused.
- Use a descriptive message that reflects the behavior change.
- Follow the existing branch unless the user explicitly asks for a new one.
