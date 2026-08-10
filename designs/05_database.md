# 05 - Database (Cloudflare D1) — PsycheWard

## 1. Tổng quan

Storage dùng **Cloudflare D1** — SQLite-compatible, truy cập từ backend Python qua HTTP REST API. Không dùng ORM, chỉ raw SQL qua `D1Client`. **Không có bảng users** — PsycheWard không có hệ thống tài khoản.

---

## 2. Kết nối — `d1_client.py`

```
POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DB_ID}/query
Authorization: Bearer {API_TOKEN}
Content-Type: application/json
Body: { "sql": "...", "params": [...] }
```

Cấu hình từ `.env`: `D1_ACCOUNT_ID`, `D1_DATABASE_ID`, `D1_API_TOKEN`.

```python
class D1Client:
    async def execute(self, sql: str, params: list = []) -> dict

    async def query(self, sql: str, params: list = []) -> list[dict]

    async def execute_batch(self, statements: list[dict]) -> list
```

Mọi query dùng parameterized statements (`?` placeholder). Không bao giờ format string SQL trực tiếp.

---

## 3. Schema

### `game_records`
```sql
CREATE TABLE game_records (
    id              TEXT PRIMARY KEY,
    room_code       TEXT NOT NULL,
    game_mode       TEXT NOT NULL,    -- 'standard' | 'quick_play' | 'chaos'
    total_players   INTEGER NOT NULL,
    started_at      TEXT NOT NULL,
    ended_at        TEXT,
    winner_guest_id TEXT,             -- guest_id của người thắng
    winner_name     TEXT,             -- display_name tại thời điểm thắng
    status          TEXT NOT NULL     -- 'in_progress' | 'finished' | 'cancelled'
);
```

### `player_records`
```sql
CREATE TABLE player_records (
    id              TEXT PRIMARY KEY,
    game_id         TEXT NOT NULL REFERENCES game_records(id),
    guest_id        TEXT NOT NULL,    -- từ localStorage
    display_name    TEXT NOT NULL,    -- snapshot tên tại thời điểm ván bắt đầu
    seat_index      INTEGER NOT NULL, -- thứ tự ngồi (0-based)
    disorders_cured INTEGER NOT NULL DEFAULT 0,
    disorders_remaining INTEGER NOT NULL DEFAULT 0,
    finished_at     TEXT              -- NULL nếu không thắng
);
```

### `turn_logs`
```sql
CREATE TABLE turn_logs (
    id              TEXT PRIMARY KEY,
    game_id         TEXT NOT NULL REFERENCES game_records(id),
    turn_number     INTEGER NOT NULL,
    guest_id        TEXT NOT NULL,
    action_type     TEXT NOT NULL,   -- 'drug' | 'therapy' | 'episode' | 'pass'
    card_slug       TEXT,            -- slug của thẻ đã dùng (NULL nếu pass)
    target_guest_id TEXT,            -- NULL nếu không nhắm vào ai
    timestamp       TEXT NOT NULL
);
```

### `chat_logs`
```sql
CREATE TABLE chat_logs (
    id           TEXT PRIMARY KEY,
    game_id      TEXT NOT NULL,
    guest_id     TEXT NOT NULL,
    display_name TEXT NOT NULL,
    message      TEXT NOT NULL,
    timestamp    TEXT NOT NULL
);
```

### `game_snapshots`
```sql
CREATE TABLE game_snapshots (
    id               TEXT PRIMARY KEY,
    game_id          TEXT NOT NULL REFERENCES game_records(id),
    room_code        TEXT NOT NULL,
    turn_number      INTEGER NOT NULL,
    state_encrypted  TEXT NOT NULL,   -- JSON encrypt AES-256
    saved_at         TEXT NOT NULL
);

CREATE INDEX idx_snapshots_room ON game_snapshots(room_code, saved_at DESC);
```

### `room_configs` *(in-memory chủ yếu, persist để resume)*
```sql
CREATE TABLE room_configs (
    room_code       TEXT PRIMARY KEY,
    host_guest_id   TEXT NOT NULL,
    game_mode       TEXT NOT NULL DEFAULT 'standard',
    initial_disorders INTEGER NOT NULL DEFAULT 4,
    max_hand_size   INTEGER NOT NULL DEFAULT 7,
    turn_timeout    INTEGER NOT NULL DEFAULT 60,
    reveal_on_cure  INTEGER NOT NULL DEFAULT 1,
    allow_chat      INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL,
    last_active_at  TEXT NOT NULL
);
```

---

## 4. Index

```sql
CREATE INDEX idx_turn_logs_game  ON turn_logs(game_id, turn_number);
CREATE INDEX idx_chat_logs_game  ON chat_logs(game_id, timestamp);
CREATE INDEX idx_player_game     ON player_records(game_id);
```

---

## 5. Snapshot retention

Giữ tối đa **5 snapshot gần nhất** mỗi ván (nhiều hơn Ma Sói vì lượt đi ngắn hơn — cần nhiều checkpoint hơn để không mất quá nhiều progress khi restart). Sau mỗi lần ghi snapshot mới, xóa snapshot cũ hơn nếu tổng số > 5. Dùng `execute_batch` để ghi mới + xóa cũ atomic.
