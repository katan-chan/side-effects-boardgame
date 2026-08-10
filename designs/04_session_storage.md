# 04 - Session & Lobby Server — PsycheWard

## 1. Tổng quan

PsycheWard không có đăng nhập. Định danh người chơi dựa trên **guest session** lưu trong `localStorage`. Lobby (tạo/vào phòng) dùng Express routes mount lên cùng server với boardgame.io.

---

## 2. Guest Session (Frontend)

### Cấu trúc localStorage

```json
{
  "guest_id": "uuid-v4-here",
  "display_name": "CrazyNurse#4821",
  "last_seen": "2025-08-10T14:30:00Z"
}
```

### Rolling expiry — 14 ngày

```javascript
// client/src/hooks/useGuestSession.js
const EXPIRY_DAYS = 14;
const STORAGE_KEY = "psycheward_guest";

export function useGuestSession() {
  const [session, setSession] = useState(() => loadOrCreate());

  function loadOrCreate() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      const daysSince = (Date.now() - new Date(s.last_seen)) / 86_400_000;
      if (daysSince < EXPIRY_DAYS) {
        s.last_seen = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
        return s;
      }
    }
    return createNew();
  }

  function createNew() {
    const s = {
      guest_id: crypto.randomUUID(),
      display_name: generateRandomName(),
      last_seen: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    return s;
  }

  function rename(newName) {
    const s = { ...session, display_name: newName };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setSession(s);
  }

  return { session, rename };
}
```

### Name pool tự động

```javascript
const ADJECTIVES = [
  "Crazy", "Anxious", "Paranoid", "Drowsy", "Manic",
  "Bipolar", "Jittery", "Zoned", "Glitchy", "Foggy",
  "Restless", "Scattered", "Numb", "Frantic", "Dazed",
];
const NOUNS = [
  "Nurse", "Doctor", "Patient", "Intern", "Orderly",
  "Shrink", "Pharmacist", "Therapist", "Resident", "Medic",
];

function generateRandomName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const id = Math.floor(1000 + Math.random() * 9000);
  return `${adj}${noun}#${id}`;
}
```

---

## 3. Lobby API (Express, mount trên boardgame.io server)

boardgame.io có sẵn `LobbyClient` nhưng yêu cầu credential — mình tự viết lobby nhẹ để hỗ trợ guest.

### Endpoints

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/health` | Health check cho keep-alive ping |
| `POST` | `/lobby/create` | Tạo phòng mới, trả về `matchID` |
| `GET` | `/lobby/matches` | Danh sách phòng đang chờ |
| `POST` | `/lobby/join` | Join phòng, trả về `playerID` và `credentials` |
| `POST` | `/lobby/leave` | Rời phòng |
| `PATCH` | `/lobby/rename` | Đổi tên trong phòng |

### Tạo phòng — `POST /lobby/create`

```javascript
// server/src/lobby/router.js
router.post("/create", async (req, res) => {
  const { display_name, settings } = req.body;
  if (!isValidName(display_name)) return res.status(400).json({ error: "invalid_name" });

  // boardgame.io server API — tạo match mới
  const matchID = await server.db.createMatch("PsycheWard", {
    numPlayers: settings?.numPlayers ?? 4,
    setupData: { settings, playerNames: [] },
    unlisted: false,
  });

  res.json({ matchID });
});
```

### Join phòng — `POST /lobby/join`

```javascript
router.post("/join", async (req, res) => {
  const { matchID, guest_id, display_name, seat } = req.body;
  if (!isValidName(display_name)) return res.status(400).json({ error: "invalid_name" });

  // Dùng boardgame.io internal API để join match
  // playerID = seat index (0-based string)
  // credentials = guest_id (dùng để authenticate WebSocket sau)
  const { playerCredentials } = await joinMatch(matchID, seat, {
    playerName: display_name,
    playerCredentials: guest_id,
  });

  res.json({ playerID: String(seat), credentials: playerCredentials });
});
```

---

## 4. Kết nối boardgame.io từ Client

Sau khi join lobby, client khởi tạo boardgame.io connection:

```jsx
// client/src/pages/GamePage.jsx
import { Client } from "boardgame.io/react";
import { SocketIO } from "boardgame.io/multiplayer";
import { PsycheWardGame } from "../config/gameDefinition.js"; // mirror của game trên server
import { Board } from "../components/game/Board.jsx";

const PsycheWardClient = Client({
  game: PsycheWardGame,
  board: Board,
  multiplayer: SocketIO({ server: import.meta.env.VITE_SERVER_URL }),
  debug: import.meta.env.DEV,  // bật debug panel khi dev
});

export function GamePage() {
  const { matchID, playerID, credentials } = useRouteParams(); // từ URL / state
  return (
    <PsycheWardClient
      matchID={matchID}
      playerID={playerID}
      credentials={credentials}
    />
  );
}
```

boardgame.io tự lo:
- WebSocket connection + reconnect
- State sync: `G` và `ctx` tự cập nhật trong `Board` props
- Secret state: `playerView` filter hand trước khi gửi về client

---

## 5. Board component nhận gì từ boardgame.io

```jsx
// client/src/components/game/Board.jsx
export function Board({ G, ctx, moves, playerID, matchData, isActive }) {
  // G        — game state (đã filter bởi playerView)
  // ctx      — turn, phase, currentPlayer, gameover
  // moves    — object các moves: moves.playDrug(), moves.passTurn(), ...
  // playerID — ID của người chơi hiện tại trên thiết bị này
  // isActive — true nếu đang đến lượt mình (hoặc đang trong activePlayers)
  // matchData— display names của các player
  // ...
}
```

FE **không tự modify state** — chỉ gọi `moves.xxx()` và nhận `G` mới từ server.

---

## 6. Chat (Socket.io custom, song song với boardgame.io)

boardgame.io không có chat built-in. Chat dùng Socket.io namespace `/chat` riêng, mount lên cùng server:

```javascript
// server/src/index.js
const io = new Server(server.httpServer);
const chat = io.of("/chat");

chat.on("connection", (socket) => {
  socket.on("join", ({ matchID }) => socket.join(matchID));
  socket.on("message", ({ matchID, displayName, text }) => {
    if (!text?.trim()) return;
    chat.to(matchID).emit("message", {
      displayName,
      text: text.trim().slice(0, 300), // max 300 ký tự
      timestamp: new Date().toISOString(),
    });
  });
});
```

```javascript
// client — useChat hook
import { io } from "socket.io-client";
const chatSocket = io(`${SERVER_URL}/chat`);
```

---

## 7. Thay đổi so với bản Python

| Bản Python/FastAPI | Bản Node/boardgame.io |
|---|---|
| Tự viết WebSocket với FastAPI | boardgame.io + Socket.io tự lo |
| Tự viết turn management | `ctx.currentPlayer`, `ctx.turn` tự quản lý |
| Tự viết game state sync | `G` tự sync sau mỗi move |
| Tự viết reconnect logic | boardgame.io tự xử lý |
| Tự viết secret state filter | `playerView` callback |
| Snapshot thủ công vào D1 | `StorageAPI` tự gọi sau mỗi move |
| Cloudflare D1 | PostgreSQL (cùng Render) |
| Không cần JWT (guest_id thuần) | Giữ nguyên — `credentials = guest_id` |
