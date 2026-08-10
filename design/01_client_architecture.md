# Client Architecture

## Main entry points

- `src/main.tsx` mounts the React app.
- `src/pages/App.tsx` selects the active mode and current screen.
- `src/store/gameStore.ts` stores local game state and command helpers.

## Main UI pieces

- `src/components/HomeScreen.tsx` is the entry screen.
- `src/components/SetupScreen.tsx` handles local setup.
- `src/components/OnlineLobby.tsx` handles room create/join/leave and active room sessions.
- `src/components/GameBoard.tsx` renders the board, cards, controls, and log.
- `src/components/FinishedScreen.tsx` shows the end state.

## Shared concerns

- `src/i18n/` contains translations.
- `src/audio/` contains audio state and playback helpers.
- `src/multiplayer/multiplayerClient.ts` wraps the Socket.IO client.
- `src/game/` contains the shared rule engine and card definitions.

## Client responsibilities

- Render the current game state.
- Collect player intent.
- Keep selection state predictable.
- Prevent duplicate or invalid actions in the UI where possible.
- Show errors clearly when the server rejects a command.

## Implementation notes

- Keep UI state separate from game state.
- Prefer small targeted components over deep prop drilling when a state slice becomes complex.
- If a UI change affects game actions, update tests in `src/game/tests/` or component tests where appropriate.
