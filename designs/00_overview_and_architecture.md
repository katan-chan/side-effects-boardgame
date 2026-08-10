# 00 - Tổng quan & Kiến trúc — PsycheWard

## 1. Dự án là gì

**PsycheWard** là web game thẻ bài nhiều người chơi theo lượt, lấy cảm hứng từ Side Effects (Pillbox Games). Mỗi người dùng thiết bị riêng (điện thoại hoặc máy tính), **không cần tài khoản** — chỉ cần điền tên và nhập mã phòng là chơi được.

**Cơ chế nhận dạng người chơi (thay cho đăng nhập):**
- Khi truy cập lần đầu, hệ thống tạo một **cache định danh** lưu trong `localStorage` của trình duyệt.
- Người chơi chọn tên hiển thị: tự điền hoặc dùng tên tự động từ pool (`[Tính từ][Danh từ Y tế]` + ID 4–6 số, VD: `CrazyNurse#4821`).
- Cache tồn tại tối đa **14 ngày** kể từ lần truy cập gần nhất (rolling expiry). Hết hạn → tên và session reset, nhưng không ảnh hưởng ván đang chơi.
- Cache chỉ lưu: `guest_id` (UUID v4), `display_name`, `last_seen`. Không lưu thông tin cá nhân.

**Người tạo phòng (Host)** cũng là người chơi — họ cấu hình ván, điều chỉnh tùy chọn ngay tại màn hình chờ, rồi khởi động. Không có admin đứng ngoài điều phối.

**Core loop:** Mỗi người bắt đầu với 4 thẻ Bệnh (Disorder cards) — lần lượt rút thẻ, dùng thẻ Thuốc để trị bệnh, nhưng thuốc có tác dụng phụ khiến người khác có thể ném bệnh mới vào bạn. Dùng thẻ Episode để cản trở đối thủ hoặc hỗ trợ bản thân. Ai trị hết bệnh trong "tâm lý" (psyche) của mình trước thì thắng.

Tài liệu chi tiết theo từng mảng:
- `01_cards.md` — danh sách đầy đủ các loại thẻ (Disorder, Drug, Therapy, Episode)
- `02_game_modes.md` — chế độ chơi và tùy chọn cấu hình
- `03_game_engine.md` — luật chơi, lượt đi, tương tác thẻ, thắng/thua
- `04_session_storage.md` — session cache, database, WebSocket events
- `05_database.md` — schema database
- `06_websocket.md` — WebSocket event types
- `07_ui.md` — giao diện người dùng
- `08_infrastructure.md` — hạ tầng và triển khai
- `09_code_style.md` — quy tắc code

---

## 2. Tech stack

### Backend
- **FastAPI** (Python) — single process, WebSocket realtime
- **Cloudflare D1** (SQLite-compatible) — lưu session cache, lịch sử ván, snapshot
- **Không có auth** — định danh bằng `guest_id` từ localStorage

### Frontend
- **React + Vite** — component-based UI, client-side routing
- **TailwindCSS** — styling, mobile-first responsive
- **Framer Motion** — animation (lật thẻ, hiệu ứng trị bệnh, thẻ Episode)
- **Zustand** — global state (game state, WebSocket events, guest session)
- **React Query** — fetch API (room config, card data)
- **Cloudflare Pages** — static host cho React build

### Infrastructure
- **Render free tier** — host FastAPI backend (512MB RAM, 0.1 vCPU)
- **Cloudflare Worker (Cron)** — ping `/health` mỗi 10 phút để giữ Render tỉnh

---

## 3. Cấu trúc thư mục

```
psycheward/
├── keep_alive/                     # CF Worker giữ Render tỉnh
│   ├── worker.js
│   └── wrangler.toml
│
├── backend/
│   ├── .env
│   ├── .env.example
│   ├── requirements.txt
│   ├── config/
│   │   └── settings.py             # load .env, cấu hình D1 endpoint
│   ├── main.py                     # FastAPI entrypoint
│   ├── db/
│   │   ├── d1_client.py            # HTTP client gọi Cloudflare D1 REST API
│   │   └── models.py               # dataclass/schema cho từng bảng
│   ├── session/
│   │   ├── router.py               # POST /session/init, /session/rename
│   │   └── service.py              # tạo/validate guest_id, rolling expiry
│   ├── enums.py
│   ├── card.py                     # Card dataclass, CardType enum
│   ├── deck.py                     # Deck builder, shuffle, draw
│   ├── player.py                   # PlayerState: hand, psyche, status
│   ├── game.py                     # GameState, vòng lặp lượt đi
│   ├── resolver.py                 # resolve effect thẻ, tính tác dụng phụ
│   ├── room_manager.py             # tạo/tìm/xóa phòng, load check
│   ├── cards/
│   │   ├── disorders.py            # danh sách Disorder cards
│   │   ├── drugs.py                # danh sách Drug cards + side effects
│   │   ├── therapies.py            # danh sách Therapy cards
│   │   └── episodes.py             # danh sách Episode cards
│   ├── ws/
│   │   ├── router.py               # WebSocket endpoint /ws/{room_code}
│   │   ├── events.py               # định nghĩa các loại event
│   │   └── broadcaster.py          # gửi event tới toàn phòng hoặc 1 người
│   └── logs/
│       └── YYYY-MM-DD.log
│
└── frontend/
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx                  # React Router v6
    │   ├── store/
    │   │   ├── gameStore.js         # Zustand — game state
    │   │   └── guestStore.js        # Zustand — guest session (display_name, guest_id)
    │   ├── hooks/
    │   │   ├── useWebSocket.js      # WS connect, auto-reconnect, dispatch to store
    │   │   ├── useGameTimer.js      # Countdown timer sync với server
    │   │   └── useGuestSession.js   # Đọc/ghi localStorage, rolling expiry
    │   ├── pages/
    │   │   ├── LandingPage.jsx      # Nhập tên + tạo/vào phòng
    │   │   ├── RoomPage.jsx         # Phòng chờ + cấu hình
    │   │   └── GamePage.jsx
    │   ├── components/
    │   │   ├── game/
    │   │   │   ├── PlayerArea.jsx       # Vùng psyche + hand của 1 người chơi
    │   │   │   ├── CardComponent.jsx    # Render 1 thẻ bài (Disorder/Drug/Episode)
    │   │   │   ├── CardFlip.jsx         # Animation lật thẻ
    │   │   │   ├── HandArea.jsx         # Bài trên tay (riêng tư)
    │   │   │   ├── PsycheArea.jsx       # 4 thẻ bệnh úp ngửa trước mặt (công khai)
    │   │   │   └── ActionModal.jsx      # Chọn mục tiêu khi dùng thẻ
    │   │   ├── chat/
    │   │   │   ├── ChatPanel.jsx
    │   │   │   ├── ChatBubble.jsx
    │   │   │   └── SystemBanner.jsx
    │   │   └── ui/
    │   │       ├── Timer.jsx
    │   │       ├── Button.jsx
    │   │       └── OverloadBanner.jsx
    │   └── config/
    │       ├── theme.js             # CSS variables reference
    │       ├── wsEvents.js          # Enum event types
    │       └── cardData.js          # Card definitions (mirror từ backend)
    ├── public/
    │   ├── logo.png                 # Logo PsycheWard
    │   └── bg.png                   # Background (nếu dùng ảnh)
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## 4. Quyết định kiến trúc quan trọng

### 4.1 Không có đăng nhập — guest session qua localStorage

Mỗi lần truy cập, `useGuestSession.js` kiểm tra `localStorage`:
- Nếu chưa có → tạo `guest_id` (UUID v4) + gợi ý tên tự động → lưu vào `localStorage`.
- Nếu có nhưng đã quá 14 ngày kể từ `last_seen` → reset, tạo mới.
- Nếu có và còn hạn → cập nhật `last_seen`, dùng tiếp.

Backend nhận `guest_id` qua WebSocket handshake header. Không cần JWT, không cần cookie. `guest_id` là định danh duy nhất trong phòng — không cần unique toàn hệ thống, chỉ cần unique trong phòng đang chơi.

### 4.2 Dev mode — bỏ giới hạn phòng

Khi `DEV_MODE=true` trong `.env`:
- Không check `can_accept_connection()` → không có giới hạn phòng/người.
- Log rõ `[DEV MODE] load check skipped` để không nhầm lẫn với production.
- Giới hạn phòng và số người vẫn đọc từ config nhưng không enforce.

### 4.3 Hand riêng tư, Psyche công khai

- **Hand (bài trên tay):** chỉ gửi qua WebSocket đến đúng người đó — người khác không thấy.
- **Psyche (4 thẻ bệnh trước mặt):** broadcast công khai cho toàn phòng — mọi người đều biết bạn đang bệnh gì.
- BE là source of truth cho toàn bộ GameState — FE chỉ nhận event và render.

### 4.4 Host = người chơi có quyền cấu hình

Host tạo phòng, ngồi vào bàn, chơi cùng. Có thêm quyền: chỉnh tùy chọn ván (ngay tại màn hình chờ), kick người chưa sẵn sàng, bắt đầu ván, kết thúc sớm. Sau khi ván bắt đầu, Host không có thông tin đặc quyền hơn người khác.

### 4.5 Load check trước khi cho join

```python
import psutil

def can_accept_connection() -> bool:
    return (
        psutil.virtual_memory().percent < 80 and
        psutil.cpu_percent(interval=0.1) < 85
    )
```

Nếu vượt ngưỡng → trả về thông báo hài hước thay vì để server crash. Bỏ qua check này khi `DEV_MODE=true`.

### 4.6 Game state persistence vào D1

Snapshot GameState sau mỗi lượt đi xong (kết thúc action của 1 người) và cuối mỗi vòng. Encrypt AES-256 trước khi ghi. Khi server restart, Host reconnect và thấy nút Resume. Chi tiết tại `03_game_engine.md`.

### 4.7 Chat có thanh cuộn

Panel chat hỗ trợ cuộn (overflow-y: auto + max-height cố định). Tin nhắn mới tự cuộn xuống cuối, nhưng nếu người chơi đang cuộn lên đọc lại thì không tự nhảy xuống — chỉ cuộn tự động khi người chơi đang ở cuối feed.
