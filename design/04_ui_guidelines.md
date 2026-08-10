# UI Guidelines

## Layout goals

- Keep the main controls visible without forcing scroll.
- Center the deck and make the play area easy to scan.
- Place destructive or exit actions where they are hard to cover.
- Keep the hand usable on smaller screens.

## Card behavior

- Card heights should stay consistent inside the hand.
- Selected cards should be visually distinct.
- Clicking an already selected card should deselect it and restore its position.
- Drug attachments should overlay the existing disorder card.
- If the attached card is discarded by an effect, remove the overlay entirely.

## Control placement

- Exit and surrender actions belong in the top-right area.
- Log and audio controls should remain accessible in a compact stack.
- Sorting and discard actions should be compact and should not dominate the layout.

## Error handling

- Rule violations should surface as a popup or visible error state.
- The user should always understand why a play failed.
- Do not rely on silent rejections.

## Responsive rules

- Preserve the board layout on desktop.
- Compress the control stack on mobile rather than hiding core actions.
- Prefer vertical space efficiency over decorative spacing when the board is crowded.
