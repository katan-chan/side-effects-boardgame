# 09 - Code Style — PsycheWard

## 1. Ngôn ngữ

| Ngữ cảnh | Ngôn ngữ |
|---|---|
| Giao tiếp với người dùng (UI text, thông báo, toast, banner) | Tiếng Việt |
| Code: tên biến, hàm, class, file, module | Tiếng Anh |
| Comment trong code | Tiếng Anh |
| Tài liệu thiết kế (các file .md này) | Tiếng Việt |

---

## 2. Module system

Toàn bộ project dùng **ES Modules** (`"type": "module"` trong `package.json`). Không dùng CommonJS (`require`).

```javascript
// Đúng
import { query } from "./db/client.js";
export function canCure(drug, disorder) { ... }

// Sai
const { query } = require("./db/client");
module.exports = { canCure };
```

Extension `.js` bắt buộc trong import path (Node ES Module yêu cầu).

---

## 3. Comment

**Tối thiểu hóa.** Code tốt tự giải thích.

**Nên có:**
- Comment giải thích *tại sao*, không phải *cái gì*
- Logic không hiển nhiên (đặc biệt boardgame.io quirks)
- `// TODO:` hoặc `// FIXME:`

```javascript
// boardgame.io returns INVALID_MOVE (not throws) to signal validation failure
if (!canCure(drug, disorder)) return INVALID_MOVE;

// wait full window duration — early close leaks reaction timing info
setTimeout(closeWindow, SIDE_EFFECT_WINDOW_SECONDS * 1000);
```

---

## 4. Tách hàm

**1 hàm làm 1 việc.** Nếu hàm > ~30 dòng hoặc cần mô tả bằng "và" → tách.

```javascript
// Đúng — server/src/game/resolver.js
export function resolveDrug(G, player, drug, disorder) {
  if (!canCure(drug, disorder)) return null;
  removePsycheDisorder(player, disorder.slug);
  removeHandCard(player, drug.slug);
  G.discardPile.push(drug.slug);
  return buildSideEffectWindow(player, drug);
}

function canCure(drug, disorder) { ... }
function removePsycheDisorder(player, slug) { ... }
function removeHandCard(player, slug) { ... }
function buildSideEffectWindow(player, drug) { ... }
```

---

## 5. Đặt tên

**Rõ ràng hơn ngắn gọn.**

```javascript
// Sai
const p = G.players[Number(ctx.cp)];
const d = findDisorder(slug);

// Đúng
const currentPlayer = G.players[Number(ctx.currentPlayer)];
const disorder = findDisorderBySlug(slug);
```

**Convention:**
- `camelCase` cho biến và hàm.
- `PascalCase` cho class và React component.
- `UPPER_SNAKE_CASE` cho hằng số.
- File server: `camelCase.js`. File React component: `PascalCase.jsx`. File hook: `useCamelCase.js`.

---

## 6. boardgame.io specifics

**Moves phải pure function** (không side effects ngoài modify `G`):
```javascript
// Đúng — chỉ modify G
export function playDrug(G, ctx, { cardSlug, targetDisorderSlug }) {
  G.players[Number(ctx.currentPlayer)].hand = ...;
}

// Sai — không gọi external service trong move
export function playDrug(G, ctx, args) {
  await logToDatabase(...); // ❌ move không được async
}
```

**Logging trong moves:** Dùng `G.lastAction` để FE biết cần hiển thị gì. Server logging thực hiện trong `onEnd`/`onBegin` hook hoặc `StorageAPI`, không trong move.

**INVALID_MOVE:** Import từ `boardgame.io/core`, return (không throw) khi move không hợp lệ:
```javascript
import { INVALID_MOVE } from "boardgame.io/core";

export function playDrug(G, ctx, args) {
  if (!isValid(args)) return INVALID_MOVE;
  ...
}
```

---

## 7. React specifics

- Mỗi component trong file riêng.
- Business logic vào hook hoặc store — không trong component.
- Game state đọc từ `G`/`ctx` props (boardgame.io) — không duplicate vào Zustand.
- Zustand chỉ cho UI state: guest session, lobby, chat messages, timer display preference.

---

## 8. Hằng số tập trung (`server/src/game/constants.js`)

```javascript
// Gameplay
export const INITIAL_DISORDERS = 4;
export const INITIAL_HAND_SIZE = 4;
export const DEFAULT_MAX_HAND_SIZE = 7;
export const DEFAULT_TURN_TIMEOUT_SECONDS = 60;
export const SIDE_EFFECT_WINDOW_SECONDS = 10;
export const DISCARD_TIMEOUT_SECONDS = 10;
export const CHOOSE_DISORDER_TIMEOUT_SECONDS = 10;

// Connection
export const AFK_TIMEOUT_SECONDS = 30;
export const GUEST_SESSION_EXPIRY_DAYS = 14;

// Server
export const MAX_PLAYERS_PER_ROOM = 8;
export const MAX_ROOMS = 10;              // bỏ qua khi DEV_MODE=true
export const LOAD_CHECK_RAM_THRESHOLD = 80; // %

// boardgame.io
export const GAME_NAME = "PsycheWard";
```

Mirror một phần sang client: `client/src/config/constants.js` cho các giá trị FE cần (timeouts, max hand size...).

---

## 9. Không commit

```gitignore
# .gitignore
node_modules/
.env
*.log
dist/
```

Không commit `console.log` debug còn sót. Dùng `logger.debug()` từ `utils/logger.js` — tự tắt trong production.
