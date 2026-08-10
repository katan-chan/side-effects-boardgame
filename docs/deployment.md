# Deployment Guide

## Build

```bash
npm run build
```

This produces the client bundle and the server bundle.

## Run the server bundle

```bash
npm run server:start
```

## Environment

The repository uses environment variables for client and server configuration.

Typical values:

- `VITE_MULTIPLAYER_SERVER_URL`
- `PORT`
- `CLIENT_ORIGIN`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

## Storage

- Without Supabase variables, the server uses in-memory storage.
- With Supabase variables, room snapshots can be persisted.

## Release checklist

1. Run the test suite.
2. Run the build.
3. Verify the production server starts.
4. Confirm the client points at the correct server URL.
