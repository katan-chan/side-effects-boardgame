# Overview

This repository implements a browser-based multiplayer card game using a single TypeScript codebase.

## High-level layout

- The client lives in `src/` and is built with React, Vite, and Zustand.
- The server lives in `server/` and runs Socket.IO plus a small HTTP health endpoint.
- The game engine is shared with the client and tested in isolation under `src/game/`.
- Optional durable room storage is backed by Supabase through `server/persistence/`.

## Core principles

1. The server is authoritative for gameplay.
2. The client renders state and submits player intent.
3. Card effects should stay deterministic and testable.
4. UI validation should be mirrored by server validation.
5. Hidden information must never be exposed through public logs.

## Runtime model

- The client loads a mode screen, then either starts a local game or joins an online room.
- Online play keeps a room and player identity on the server.
- Commands flow from the client to the server, then back as updated room state.
- Tests cover rules, command handling, and persistence behavior.

## Related docs

- [Client architecture](01_client_architecture.md)
- [Server architecture](02_server_architecture.md)
- [Game flow](03_game_flow.md)
- [UI guidelines](04_ui_guidelines.md)
- [Testing and quality](05_testing_and_quality.md)
