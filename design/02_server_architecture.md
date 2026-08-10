# Server Architecture

## Responsibilities

The server is responsible for:

- room lifecycle
- player identity and reconnect/session handling
- command validation
- game state mutation through the shared engine
- persistence to memory or Supabase
- Socket.IO broadcasting

## Important files

- `server/app.ts` creates the HTTP server and Socket.IO server.
- `server/index.ts` starts the runtime.
- `server/rooms/roomService.ts` owns room state and command execution.
- `server/socket/registerSocketHandlers.ts` binds socket events.
- `server/persistence/` contains storage adapters and serializers.
- `server/security/sessionToken.ts` handles room session credentials.

## Runtime behavior

1. A client connects and identifies the room/player.
2. The server validates the session and connection state.
3. Gameplay commands are passed to `RoomService`.
4. `RoomService` calls the shared engine and updates the room snapshot.
5. The server persists the result if configured to do so.
6. The updated state is emitted to connected clients.

## Persistence model

- In development, the server can use in-memory room storage.
- In production, Supabase persistence can be enabled.
- Snapshots must be serialized and deserialized through the repository layer.
- Unsupported snapshots should be skipped rather than crashing the server.

## Server rules

- Never trust the client for turn ownership or rule enforcement.
- Reject commands when the room is not in a valid state.
- Keep public logs free of hidden role data.
- Treat reconnect and disconnect behavior as part of the normal room lifecycle.
