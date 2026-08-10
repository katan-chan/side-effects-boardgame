# Testing and Quality

## What to test

- deck construction
- turn transitions
- card targeting
- discard and attachment behavior
- end conditions
- room lifecycle and reconnect behavior
- socket payload validation

## Existing test locations

- `src/game/tests/`
- `src/audio/tests/`
- `server/tests/`

## Recommended workflow

1. Implement the change.
2. Add or update a focused test.
3. Run the test suite.
4. Run a production build.
5. Verify the UI if the change affects layout or interaction.

## Quality expectations

- Prefer deterministic logic.
- Keep engine rules separate from view logic.
- Make new public behavior discoverable in docs.
- Do not leave edge-case behavior undocumented if it affects gameplay.
