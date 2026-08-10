# 06 - Client ↔ Server — PsycheWard (boardgame.io)

## 1. Tổng quan

boardgame.io thay thế hoàn toàn layer WebSocket thủ công. Thay vì định nghĩa event types, mình định nghĩa **moves** (client → server) và **state** (server → client tự động).

Không còn file `wsEvents.js` — thay bằng `moves` object và `G` state.

---

## 2. Cách boardgame.io sync state

```
Client gọi moves.playDrug(...)
  → boardgame.io gửi lên server qua Socket.io
  → Server validate + update G
  → boardgame.io broadcast G mới về tất cả client trong match
  → Board component re-render với G mới
```

FE không cần listen event thủ công — chỉ cần đọc `G` và `ctx` từ props của `Board`.

---

## 3. Moves (Client → Server)

Định nghĩa trong `server/src/game/moves.js`, gọi từ client qua `moves.xxx()`.

### Phòng chờ / lobby (HTTP, không phải boardgame.io move)

| HTTP | Path | Payload | Response |
|---|---|---|---|
| `POST` | `/lobby/create` | `{ display_name, settings }` | `{ matchID }` |
| `POST` | `/lobby/join` | `{ matchID, guest_id, display_name, seat }` | `{ playerID, credentials }` |
| `POST` | `/lobby/leave` | `{ matchID, playerID, credentials }` | `{ ok }` |
| `PATCH` | `/lobby/rename` | `{ matchID, playerID, credentials, display_name }` | `{ ok }` |
| `GET` | `/lobby/matches` | — | `[{ matchID, numPlayers, players, settings }]` |

### Trong ván (boardgame.io moves)

| Move | Payload | Điều kiện hợp lệ |
|---|---|---|
| `moves.playDrug` | `{ cardSlug, targetDisorderSlug }` | Đến lượt, card trong hand, drug type khớp disorder |
| `moves.playTherapy` | `{ cardSlug, targetPlayerID? }` | Đến lượt, card trong hand |
| `moves.playEpisode` | `{ cardSlug, targetPlayerID, targetDisorderSlug }` | Đến lượt, target active, target có disorder đó |
| `moves.passTurn` | — | Đến lượt |
| `moves.reactSideEffect` | `{ disorderSlug }` | Trong `activePlayers` stage "react", disorder type hợp lệ |
| `moves.skipSideEffect` | — | Trong `activePlayers` stage "react" |
| `moves.discardCard` | `{ cardSlug }` | Trong stage "discard", card trong hand |
| `moves.confirmReady` | — | Trong phase "deal" |

---

## 4. State (Server → Client tự động)

boardgame.io tự sync `G` và `ctx` sau mỗi move. `Board` component nhận:

### `G` — game state

Xem cấu trúc đầy đủ trong `03_game_engine.md §2`.

Key fields FE cần đọc:
- `G.players[i].psyche` — Disorder cards của player i (công khai)
- `G.players[i].hand` — tay bài (chỉ non-null cho chính mình — đã filter bởi `playerView`)
- `G.players[i].isVulnerable` — đang hở side effects
- `G.sideEffectWindow` — `null` hoặc `{ targetPlayerID, vulnerableTypes }`
- `G.lastAction` — action vừa thực hiện (FE dùng để hiển thị system banner)
- `G.settings` — cấu hình ván

### `ctx` — turn/phase context

Key fields FE cần đọc:
- `ctx.currentPlayer` — playerID đang đến lượt (string index)
- `ctx.turn` — số thứ tự lượt
- `ctx.phase` — `"deal"` | `"mainGame"` | `"sideEffectWindow"`
- `ctx.activePlayers` — object `{ playerID: stageName }` khi nhiều người active cùng lúc
- `ctx.gameover` — `{ winner, winnerID }` khi ván kết thúc

### `isActive` — FE dùng để enable/disable controls

boardgame.io tính sẵn `isActive` cho mỗi client:
- `true` nếu `ctx.currentPlayer === playerID` (đến lượt)
- `true` nếu `playerID` trong `ctx.activePlayers` (đang trong Side Effect Window)
- `false` tất cả trường hợp còn lại

---

## 5. Chat (Socket.io `/chat` namespace)

Chat chạy song song với boardgame.io, cùng server khác namespace.

### Client → Server

```javascript
// Gửi tin nhắn
chatSocket.emit("message", {
  matchID: "ABC123",
  displayName: "CrazyNurse#4821",
  text: "gg ez",
});
```

### Server → Client

```javascript
// Nhận tin nhắn (broadcast về cùng room)
chatSocket.on("message", ({ displayName, text, timestamp }) => {
  // append vào chat feed
});
```

### System messages

Khi `G.lastAction` thay đổi (FE detect qua `useEffect` trên `G.lastAction`), FE tự tạo system banner từ `lastAction`:

```javascript
// client/src/components/ui/SystemBanner.jsx
const bannerText = {
  DRUG: `${a.playerName} dùng ${a.cardName} → trị ${a.disorderCured}`,
  THERAPY: `${a.playerName} dùng ${a.therapyName}`,
  EPISODE: `${a.playerName} tung ${a.cardName} vào ${a.targetName} (${a.disorderTriggered})`,
  SIDE_EFFECT_REACT: `${a.reactorName} thêm ${a.disorderAdded} vào ${a.targetName}`,
  PASS: `${a.playerName} bỏ lượt`,
};
```

Không cần server push riêng — `G.lastAction` đã được sync tự động.

---

## 6. Validation

boardgame.io validate moves **trên server** — move trả về `INVALID_MOVE` nếu không hợp lệ. FE nhận `moveResult` và có thể hiển thị toast lỗi.

FE cũng disable các action không hợp lệ (dùng `isActive`, kiểm tra `G.players[i].isActive`) nhưng server là lớp validate cuối.

**Bug fix từ bản gốc:** Player không còn active (`isActive = false` do AFK) không được phép là mục tiêu Episode. Validate trong `playEpisode` move: `if (!target.isActive) return INVALID_MOVE`. FE lọc danh sách target, không hiển thị người không active.

---

## 7. Reconnect

boardgame.io tự xử lý reconnect:
- Client mất kết nối → Socket.io tự thử reconnect.
- Khi reconnect thành công, boardgame.io gửi lại toàn bộ `G` và `ctx` hiện tại.
- Không cần `GAME_STATE_SYNC` event thủ công như bản Python.
- Match state được persist trong PostgreSQL (qua `StorageAPI`) → server restart không mất state.

Người chơi AFK: boardgame.io không tự đánh dấu AFK. Mình tự implement trong `onBegin` của turn:
```javascript
// Nếu player không submit move trong timeout → auto passTurn
turn: {
  moveLimit: 1,
  onBegin: (G, ctx) => {
    // boardgame.io có turnOrder.once() để auto-end sau timeout
    // hoặc dùng setTimeout server-side để gọi moves.passTurn
  }
}
```
