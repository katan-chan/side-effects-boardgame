# 00 - Tổng quan & Kiến trúc — PsycheWard

## 1. Dự án là gì

**PsycheWard** là web game thẻ bài nhiều người chơi theo lượt, lấy cảm hứng từ Side Effects (Pillbox Games). Mỗi người dùng thiết bị riêng (điện thoại hoặc máy tính), **không cần tài khoản** — chỉ cần điền tên và nhập mã phòng là chơi được.

**Cơ chế nhận dạng người chơi:**
- Khi truy cập lần đầu, hệ thống tạo **guest session** lưu trong `localStorage`.
- Người chơi chọn tên hiển thị: tự điền hoặc dùng tên tự động từ pool (`[Tính từ][Danh từ Y tế]` + ID 4 số, VD: `CrazyNurse#4821`).
- Session tồn tại tối đa **14 ngày** kể từ lần truy cập gần nhất (rolling expiry).

**Core loop:** Mỗi người bắt đầu với 4 thẻ Bệnh (Disorder cards) — lần lượt rút thẻ, dùng thẻ Thuốc để trị bệnh, nhưng thuốc có tác dụng phụ khiến người khác có thể ném bệnh mới vào bạn. Dùng thẻ Episode để cản trở đối thủ hoặc hỗ trợ bản thân. Ai trị hết bệnh trong "psyche" của mình trước thì thắng.

Tài liệu chi tiết:
- `01_cards.md` — danh sách đầy đủ các loại thẻ
- `02_game_modes.md` — chế độ chơi và tùy chọn cấu hình
- `03_game_engine.md` — boardgame.io Game object, moves, phases
- `04_session_storage.md` — guest session, lobby server
- `05_database.md` — schema database (PostgreSQL)
- `06_client_server.md` — boardgame.io client/server events
- `07_ui.md` — giao diện người dùng
- `08_infrastructure.md` — hạ tầng và triển khai
- `09_code_style.md` — quy tắc code

---

## 2. Tech stack

### Game Server
- **boardgame.io** — framework game turn-based: quản lý game state, turn order, multiplayer sync, reconnect tự động
- **Node.js** — runtime cho boardgame.io server
- boardgame.io tự tích hợp WebSocket (dùng Socket.io bên dưới) — **không cần tự viết WebSocket**

### Lobby & Session Server
- **Express** (nhẹ, kèm theo boardgame.io) — serve lobby API: tạo phòng, danh sách phòng, guest session
- boardgame.io có sẵn `LobbyClient` nhưng mình dùng custom lobby để hỗ trợ guest session (không cần auth)

### Frontend
- **React + Vite** — component-based UI, client-side routing
- **boardgame.io/react** (`Client` component) — kết nối tới boardgame.io server, nhận game state tự động
- **TailwindCSS** — styling, mobile-first responsive
- **Framer Motion** — animation (lật thẻ, hiệu ứng dùng thuốc)
- **Zustand** — UI state ngoài game (guest session, lobby state)
- **Cloudflare Pages** — static host cho React build

### Database
- **PostgreSQL** (Render free tier, 1GB) — lưu lịch sử ván, game logs
- boardgame.io hỗ trợ pluggable database — dùng **`StorageAPI` custom** để ghi vào PostgreSQL

### Infrastructure
- **Render** — host Node.js server (boardgame.io + Express lobby), free tier
- **Cloudflare Worker (Cron)** — ping `/health` mỗi 10 phút giữ Render tỉnh

> **Tại sao PostgreSQL thay vì Cloudflare D1?**
> boardgame.io server chạy Node.js trên Render — không thể gọi Cloudflare D1 REST API hiệu quả từ đây (latency cao, không có SDK chính thức cho Node). PostgreSQL trên Render cùng datacenter với server → latency thấp, driver native (`pg`) ổn định.

---

## 3. Cấu trúc thư mục

```
psycheward/
├── keep_alive/
│   ├── worker.js
│   └── wrangler.toml
│
├── server/                          # Node.js — boardgame.io + Express lobby
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   ├── src/
│   │   ├── index.js                 # Entrypoint: khởi động boardgame.io server + lobby
│   │   ├── game/
│   │   │   ├── PsycheWard.js        # boardgame.io Game definition (moves, phases, endIf)
│   │   │   ├── moves.js             # Tất cả moves: playDrug, playTherapy, playEpisode, pass
│   │   │   ├── resolver.js          # Pure functions: canCure, applyCure, sideEffects, checkWin
│   │   │   ├── deck.js              # buildDeck, shuffle, deal
│   │   │   └── constants.js         # INITIAL_DISORDERS, HAND_SIZE, SIDE_EFFECT_WINDOW, v.v.
│   │   ├── cards/
│   │   │   ├── disorders.js         # Disorder card definitions
│   │   │   ├── drugs.js             # Drug card definitions + side effects
│   │   │   ├── therapies.js         # Therapy card definitions
│   │   │   └── episodes.js          # Episode card definitions
│   │   ├── lobby/
│   │   │   ├── router.js            # Express routes: /lobby/*, /session/*, /health
│   │   │   └── guestSession.js      # Validate guest_id, display_name
│   │   └── db/
│   │       ├── client.js            # PostgreSQL pool (pg)
│   │       ├── schema.sql           # CREATE TABLE statements
│   │       └── gameLogger.js        # Ghi game_records, turn_logs sau mỗi ván
│
└── client/                          # React + Vite frontend
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── store/
        │   └── guestStore.js        # Zustand — guest session (guest_id, display_name)
        ├── hooks/
        │   ├── useGuestSession.js   # Đọc/ghi localStorage, rolling expiry
        │   └── useLobby.js          # Fetch lobby API (tạo phòng, vào phòng)
        ├── pages/
        │   ├── LandingPage.jsx      # Nhập tên + tạo/vào phòng
        │   ├── LobbyPage.jsx        # Danh sách phòng (optional)
        │   └── GamePage.jsx         # boardgame.io Client wrapper
        ├── components/
        │   ├── game/
        │   │   ├── Board.jsx            # Board component — nhận {G, ctx, moves} từ boardgame.io
        │   │   ├── PlayerArea.jsx       # Vùng psyche + hand của 1 người chơi
        │   │   ├── CardComponent.jsx    # Render 1 thẻ bài
        │   │   ├── CardFlip.jsx         # Animation lật thẻ
        │   │   ├── HandArea.jsx         # Bài trên tay (riêng tư)
        │   │   ├── PsycheArea.jsx       # 4 thẻ bệnh úp ngửa (công khai)
        │   │   └── SideEffectWindow.jsx # Overlay phản ứng tác dụng phụ
        │   ├── lobby/
        │   │   ├── RoomList.jsx
        │   │   └── RoomCard.jsx
        │   └── ui/
        │       ├── Timer.jsx
        │       ├── Button.jsx
        │       ├── ChatPanel.jsx
        │       └── SystemBanner.jsx
        └── config/
            ├── theme.js             # CSS variable reference
            └── cardData.js          # Card definitions (mirror từ server/cards/)
```

---

## 4. Quyết định kiến trúc quan trọng

### 4.1 boardgame.io làm gì

boardgame.io xử lý sẵn:
- **Game state sync** — `G` (game state) tự đồng bộ tới tất cả client sau mỗi move
- **Turn management** — `ctx.currentPlayer`, `ctx.turn`, `ctx.phase` tự quản lý
- **Move validation** — move chỉ được gọi đến server, FE không thể tự sửa state
- **Multiplayer** — Socket.io bên dưới, boardgame.io lo reconnect và state recovery
- **Secret state** — `playerView` filter: hand của mỗi người chỉ gửi đến đúng người đó
- **Active players** — Side Effect Window dùng `activePlayers` để cho nhiều người cùng phản ứng đồng thời

### 4.2 Những gì mình tự viết

- **Game logic** (moves, resolver) — boardgame.io là framework, không có logic game
- **Card definitions** — disorders, drugs, therapies, episodes
- **Deck building** — shuffle, deal
- **Lobby + guest session** — boardgame.io lobby mặc định cần auth; mình tự viết để hỗ trợ guest
- **UI/Board component** — toàn bộ frontend

### 4.3 Guest session

`guest_id` (UUID v4) gửi kèm khi join match qua boardgame.io `Client`:

```javascript
// client/src/pages/GamePage.jsx
const client = Client({
  game: PsycheWardGame,
  board: Board,
  multiplayer: SocketIO({ server }),
});

// Truyền playerID = guest_id vào Client
<client.Client playerID={guestId} matchID={roomCode} />
```

Server dùng `playerID` để định danh người chơi trong `G` và `ctx`. Không cần JWT, không cần cookie.

### 4.4 Secret state — hand riêng tư

boardgame.io có `playerView` để filter state trước khi gửi về client:

```javascript
// server/src/game/PsycheWard.js
const PsycheWard = {
  playerView: (G, ctx, playerID) => {
    // Ẩn tay bài của người khác
    const filtered = { ...G };
    filtered.players = G.players.map((p, i) => {
      if (String(i) === playerID) return p;          // tay mình → full
      return { ...p, hand: p.hand.map(() => null) }; // tay người khác → null
    });
    return filtered;
  },
};
```

### 4.5 Dev mode

`DEV_MODE=true` trong `.env`:
- Bỏ giới hạn số phòng
- boardgame.io dev server (`npm run dev`) bật sẵn debug panel tại `localhost:8000`
- Log level `DEBUG`

### 4.6 Chat

boardgame.io không có chat built-in. Dùng Socket.io custom event song song với boardgame.io connection — cùng server, khác namespace: `/chat`.
