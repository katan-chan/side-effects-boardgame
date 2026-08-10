# Game Flow and Rules

## Game phases

The engine models a turn-based card game with phases and per-turn limits.

Typical flow:

1. Setup
2. Draw or prepare actions
3. Play cards
4. End turn
5. Resolve status and victory conditions

## Card families

- `drug` cards attach to disorders.
- `disorder` cards target a player or mind state.
- `therapy` cards treat specific disorders.
- `episode` cards trigger additional decisions or effects.

## Important behaviors

- Selection state should be reversible.
- Invalid plays must fail loudly through the UI.
- Manual discard is a player action and must still respect turn rules.
- A forced discard effect must remove attached cards from the board state.
- Forfeit should end the current game and allow the room to continue cleanly.

## Edge cases to keep in mind

- End-turn should not lock the game when hand-size limits are exceeded.
- When multiple actions are allowed per turn, the UI should still allow the player to skip or finish cleanly.
- Card replacement should visually overlay the previous attachment until the slot is cleared.

## Testing guidance

- Update rule tests when a card effect changes.
- Add regression tests for any new edge case in discard, targeting, or victory behavior.
