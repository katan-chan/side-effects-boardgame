# Side Effects Boardgame

Side Effects Boardgame is a real-time multiplayer card game built with React, Vite, TypeScript, Socket.IO, and optional Supabase persistence.

The current codebase includes:

- a browser-based client in `src/`
- a Socket.IO game server in `server/`
- game rules and card logic in `src/game/`
- automated tests for both client and server behavior

## Documentation

- [Project overview and architecture](design/00_overview.md)
- [Client architecture](design/01_client_architecture.md)
- [Server architecture](design/02_server_architecture.md)
- [Game flow and rules](design/03_game_flow.md)
- [UI and interaction rules](design/04_ui_guidelines.md)
- [Testing and quality notes](design/05_testing_and_quality.md)
- [Development guide](docs/development.md)
- [Deployment guide](docs/deployment.md)
- [Troubleshooting guide](docs/troubleshooting.md)
- [Changelog](CHANGELOG.md)
- [License](LICENSE)

## Quick Start

```bash
npm install
npm run dev
```

In a second terminal:

```bash
npm run dev:server
```

## Build and Run

```bash
npm run build
npm run server:start
```

## Scripts

- `npm run dev` - start the Vite client
- `npm run dev:server` - start the server in watch mode
- `npm run build` - build the client and server bundles
- `npm run server:start` - run the production server bundle
- `npm run test` - run the test suite
- `npm run lint` - run ESLint
- `npm run format` - run Prettier

## Project Structure

```text
src/        client UI, state, game engine, audio, and tests
server/     Socket.IO server, room management, persistence, and tests
supabase/   SQL migration for optional durable room storage
design/     architecture and product design notes
docs/       developer and operational documentation
.github/    issue templates, PR template, and CI workflow
```

## Contributing

1. Fork or branch from the current repository.
2. Make the change in a focused commit.
3. Run the tests and build before opening a pull request.
4. Update docs when you change behavior or public commands.

## License

MIT. See [LICENSE](LICENSE).
