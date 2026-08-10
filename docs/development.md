# Development Guide

## Install

```bash
npm install
```

## Run locally

Start the client:

```bash
npm run dev
```

Start the server:

```bash
npm run dev:server
```

## Useful scripts

- `npm run test`
- `npm run build`
- `npm run lint`
- `npm run format`

## Notes

- The client talks to the server over Socket.IO.
- Local development can use in-memory room storage.
- When Supabase credentials are configured, the server can persist rooms.
- Keep commands and rules in sync between the client and server.
