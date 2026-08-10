# 03 - Game Engine (boardgame.io) — PsycheWard

## 1. Tổng quan

Game logic được định nghĩa hoàn toàn trong **`server/src/game/PsycheWard.js`** theo cấu trúc boardgame.io. boardgame.io xử lý turn order, state sync, và multiplayer — mình chỉ viết moves và phases.

---

## 2. Cấu trúc Game State (`G`)

```javascript
// Initial state — tạo bởi setup()
G = {
  deck: [],              // Card slugs còn trong deck (array of string)
  discardPile: [],       // Card slugs đã bỏ

  players: [
    {
      id: "0",           // playerID (index string)
      displayName: "CrazyNurse#4821",
      psyche: [          // Disorder cards trước mặt — CÔNG KHAI
        { slug: "paranoia", ...CardMeta },
        { slug: "anxiety",  ...CardMeta },
        { slug: "depression",...CardMeta },
        { slug: "insomnia", ...CardMeta },
      ],
      hand: [            // Bài trên tay — RIÊNG TƯ (filtered bởi playerView)
        { slug: "prozac",  ...CardMeta },
        { slug: "xanax",   ...CardMeta },
        { slug: "panic_attack", ...CardMeta },
        { slug: "cbt",     ...CardMeta },
      ],
      isVulnerable: false,         // Đang hở side effects
      vulnerableTypes: [],         // Loại Disorder có thể bị thêm
      isActive: true,              // False nếu AFK quá lâu
    },
    // ... các player khác
  ],

  sideEffectWindow: null,          // null hoặc { targetPlayerID, vulnerableTypes }
  lastAction: null,                // Log action vừa thực hiện (cho chat feed)
  settings: {                      // Từ room config
    gameMode: "standard",
    initialDisorders: 4,
    maxHandSize: 7,
    turnTimeout: 60,
    revealOnCure: true,
    allowChat: true,
  },
}
```

---

## 3. Phases

boardgame.io dùng `phases` để phân chia các giai đoạn trong ván:

```
setup → deal → mainGame → [sideEffectWindow] → mainGame → ... → gameOver
```

```javascript
phases: {
  deal: {
    start: true,
    turn: { moveLimit: 1 },
    moves: { confirmReady },  // mỗi player xác nhận đã xem bài
    endIf: (G, ctx) => ctx.activePlayers === null,  // tất cả confirm
    next: "mainGame",
  },

  mainGame: {
    turn: {
      moveLimit: 1,           // mỗi lượt chỉ 1 move chính
      onBegin: drawCard,      // tự động rút 1 thẻ khi bắt đầu lượt
      onEnd: checkHandLimit,  // check tay > max sau lượt
      endIf: (G, ctx) => G.sideEffectWindow !== null
        ? false               // chưa xong nếu đang có side effect window
        : undefined,
    },
    moves: { playDrug, playTherapy, playEpisode, passTurn },
    next: "sideEffectWindow",
  },

  sideEffectWindow: {
    // Tất cả player khác có thể phản ứng đồng thời
    turn: {
      activePlayers: { others: "react", moveLimit: 1 },
      onBegin: openWindow,
      endIf: (G, ctx) => {
        // Kết thúc khi tất cả đã phản ứng hoặc hết timer
        return Object.keys(ctx.activePlayers ?? {}).length === 0;
      },
    },
    moves: { reactSideEffect, skipSideEffect },
    next: "mainGame",
  },
}
```

---

## 4. Moves

Tất cả moves định nghĩa trong `server/src/game/moves.js`. Move chỉ được thực thi trên **server** — client gọi `moves.xxx()`, boardgame.io tự gửi lên server, validate, update `G`, rồi sync lại.

### `playDrug(G, ctx, { cardSlug, targetDisorderSlug })`

```javascript
export function playDrug(G, ctx, { cardSlug, targetDisorderSlug }) {
  const player = G.players[Number(ctx.currentPlayer)];
  const drugCard = findInHand(player, cardSlug);
  const disorder = findInPsyche(player, targetDisorderSlug);

  if (!drugCard || !disorder) return INVALID_MOVE;
  if (!canCure(drugCard, disorder)) return INVALID_MOVE;

  // Remove disorder from psyche
  player.psyche = player.psyche.filter(d => d.slug !== targetDisorderSlug);
  // Remove drug from hand
  player.hand = player.hand.filter(c => c.slug !== cardSlug);
  G.discardPile.push(cardSlug);

  // Set vulnerable state
  player.isVulnerable = true;
  player.vulnerableTypes = drugCard.sideEffects;

  // Open side effect window
  G.sideEffectWindow = {
    targetPlayerID: ctx.currentPlayer,
    vulnerableTypes: drugCard.sideEffects,
  };

  G.lastAction = {
    type: "DRUG",
    playerName: player.displayName,
    cardName: drugCard.displayName,
    disorderCured: G.settings.revealOnCure ? disorder.displayName : "???",
    sideEffects: drugCard.sideEffects,
  };
}
```

### `playTherapy(G, ctx, { cardSlug, targetPlayerID })`

```javascript
export function playTherapy(G, ctx, { cardSlug, targetPlayerID }) {
  const player = G.players[Number(ctx.currentPlayer)];
  const card = findInHand(player, cardSlug);
  if (!card) return INVALID_MOVE;

  applyTherapyEffect(G, ctx, card, targetPlayerID ?? ctx.currentPlayer);

  player.hand = player.hand.filter(c => c.slug !== cardSlug);
  G.discardPile.push(cardSlug);

  G.lastAction = { type: "THERAPY", playerName: player.displayName, cardName: card.displayName };
}
```

### `playEpisode(G, ctx, { cardSlug, targetPlayerID, targetDisorderSlug })`

```javascript
export function playEpisode(G, ctx, { cardSlug, targetPlayerID, targetDisorderSlug }) {
  const player = G.players[Number(ctx.currentPlayer)];
  const target = G.players[Number(targetPlayerID)];
  const card = findInHand(player, cardSlug);

  if (!card || !target) return INVALID_MOVE;
  if (!target.isActive) return INVALID_MOVE;           // không nhắm người không active
  if (target.psyche.length === 0) return INVALID_MOVE; // phải có Disorder

  const disorder = target.psyche.find(d => d.slug === targetDisorderSlug);
  if (!disorder) return INVALID_MOVE;

  applyPunishment(G, ctx, target, disorder);
  applyEpisodeBonus(G, ctx, card, player, target);

  player.hand = player.hand.filter(c => c.slug !== cardSlug);
  G.discardPile.push(cardSlug);

  G.lastAction = {
    type: "EPISODE",
    playerName: player.displayName,
    cardName: card.displayName,
    targetName: target.displayName,
    disorderTriggered: disorder.displayName,
  };
}
```

### `passTurn(G, ctx)`

```javascript
export function passTurn(G, ctx) {
  const player = G.players[Number(ctx.currentPlayer)];
  G.lastAction = { type: "PASS", playerName: player.displayName };
  // boardgame.io tự end turn sau moveLimit=1
}
```

### `reactSideEffect(G, ctx, { disorderSlug })` — trong phase sideEffectWindow

```javascript
export function reactSideEffect(G, ctx, { disorderSlug }) {
  const window = G.sideEffectWindow;
  if (!window) return INVALID_MOVE;

  // Validate disorder type matches vulnerable types
  const disorderDef = getDisorderBySlug(disorderSlug);
  if (!window.vulnerableTypes.includes(disorderDef.type)) return INVALID_MOVE;

  const target = G.players[Number(window.targetPlayerID)];
  const newDisorder = drawDisorderFromDeck(G, disorderSlug);
  target.psyche.push(newDisorder);

  G.lastAction = {
    type: "SIDE_EFFECT_REACT",
    reactorName: G.players[Number(ctx.currentPlayer)].displayName,
    disorderAdded: newDisorder.displayName,
    targetName: target.displayName,
  };
  // endStage của player này → boardgame.io tự xử lý
  ctx.events.endStage();
}
```

### `skipSideEffect(G, ctx)` — trong phase sideEffectWindow

```javascript
export function skipSideEffect(G, ctx) {
  ctx.events.endStage();
}
```

---

## 5. Turn lifecycle tự động

boardgame.io xử lý tự động các hook sau — mình chỉ định nghĩa logic:

```javascript
turn: {
  onBegin: (G, ctx) => {
    // Rút 1 thẻ khi bắt đầu lượt
    if (G.deck.length === 0) reshuffleDiscard(G);
    const card = G.deck.shift();
    G.players[Number(ctx.currentPlayer)].hand.push(card);
  },

  onEnd: (G, ctx) => {
    // Reset vulnerable state
    const player = G.players[Number(ctx.currentPlayer)];
    player.isVulnerable = false;
    player.vulnerableTypes = [];
    G.sideEffectWindow = null;

    // Check hand limit — nếu vượt, boardgame.io gọi stage "discard"
    if (player.hand.length > G.settings.maxHandSize) {
      ctx.events.setActivePlayers({
        currentPlayer: "discard",
        moveLimit: player.hand.length - G.settings.maxHandSize,
      });
    }
  },
}
```

---

## 6. Điều kiện thắng (`endIf`)

boardgame.io kiểm tra `endIf` sau **mỗi move** — không cần gọi thủ công:

```javascript
endIf: (G, ctx) => {
  for (const player of G.players) {
    if (player.psyche.length === 0) {
      return { winner: player.displayName, winnerID: player.id };
    }
  }
}
```

Khi `endIf` trả về truthy, boardgame.io tự dừng game và gửi `ctx.gameover` về tất cả clients.

---

## 7. Setup

```javascript
setup: (ctx, setupData) => {
  const settings = setupData?.settings ?? defaultSettings;
  const deck = buildAndShuffleDeck(ctx.numPlayers, settings);

  const players = Array.from({ length: ctx.numPlayers }, (_, i) => ({
    id: String(i),
    displayName: setupData?.playerNames?.[i] ?? `Player ${i + 1}`,
    psyche: deck.splice(0, settings.initialDisorders),
    hand: deck.splice(0, INITIAL_HAND_SIZE),
    isVulnerable: false,
    vulnerableTypes: [],
    isActive: true,
  }));

  return { deck, discardPile: [], players, sideEffectWindow: null, lastAction: null, settings };
}
```

---

## 8. Game state persistence (boardgame.io StorageAPI)

boardgame.io có built-in persistence qua `StorageAPI`. Mình implement custom storage ghi vào PostgreSQL:

```javascript
// server/src/db/gameLogger.js
import { StorageAPI } from "boardgame.io/internal";

export class PostgresStorage extends StorageAPI.Async {
  async createMatch(id, opts) { /* INSERT INTO matches */ }
  async fetch(id, opts) { /* SELECT FROM matches */ }
  async update(id, state) { /* UPDATE matches SET state = ... */ }
  async wipe(id) { /* DELETE FROM matches */ }
  async listMatches(opts) { /* SELECT FROM matches WHERE ... */ }
}
```

boardgame.io tự gọi `update()` sau mỗi move → không cần viết checkpoint thủ công như bản Python.

---

## 9. Server entrypoint

```javascript
// server/src/index.js
import { Server } from "boardgame.io/server";
import { PsycheWard } from "./game/PsycheWard.js";
import { PostgresStorage } from "./db/gameLogger.js";
import { lobbyRouter } from "./lobby/router.js";

const server = Server({
  games: [PsycheWard],
  db: new PostgresStorage(process.env.DATABASE_URL),
  origins: [process.env.CLIENT_URL],
});

// Mount lobby routes lên cùng Express app của boardgame.io
server.app.use("/lobby", lobbyRouter);
server.app.get("/health", (req, res) => res.json({ status: "ok" }));

server.run(process.env.PORT ?? 8000);
```
