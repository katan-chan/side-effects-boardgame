# Troubleshooting Guide

## Common issues

### The client cannot connect to the server

- Check `VITE_MULTIPLAYER_SERVER_URL`.
- Confirm the server is running.
- Verify CORS origin settings in the server config.

### A room does not restore

- Confirm the session token is still present in the browser session storage.
- Check whether the persisted snapshot format is supported.
- Review server logs for deserialization errors.

### A command appears to do nothing

- Confirm the turn belongs to the active player.
- Check whether a pending decision must be resolved first.
- Inspect the visible error popup or the log drawer.

### Build or tests fail after a rule change

- Update the engine and the tests together.
- Re-run `npm run test`.
- Re-run `npm run build`.
