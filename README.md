# side-effects-boardgame
A web-based adaptation of the Side Effects card game for playing with friends.

## Development

```bash
npm install
npm run dev:server
npm run dev:client
```

Copy `.env.example` to `.env.local` to override defaults. The client reads
`VITE_MULTIPLAYER_SERVER_URL`; the server reads `PORT` and `CLIENT_ORIGIN`.

## Production

```bash
npm run build
npm run server:start
```

Host the `dist/` frontend separately and set `VITE_MULTIPLAYER_SERVER_URL` at
build time to the server URL. Set `CLIENT_ORIGIN` to that frontend origin.

For durable online rooms, create a Supabase project, run
`supabase/migrations/001_initial.sql`, then set server-only `SUPABASE_URL` and
`SUPABASE_SECRET_KEY`. Production startup requires both variables; development
uses in-memory persistence when they are absent.
