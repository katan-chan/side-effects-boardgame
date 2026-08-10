# 05 - Database (PostgreSQL) — PsycheWard

## 1. Tổng quan

Storage dùng **PostgreSQL** trên Render free tier (1GB). boardgame.io tự quản lý match state qua `StorageAPI` — bảng `matches` do boardgame.io tự tạo/quản lý. Mình chỉ thêm các bảng logging riêng.

Driver: **`pg`** (node-postgres) — pool connection, không dùng ORM.

```
DATABASE_URL = postgresql://user:pass@host:5432/psycheward
```

---

## 2. Bảng do boardgame.io quản lý

boardgame.io tự tạo và quản lý các bảng này khi dùng `PostgresStorage`:

| Bảng | Nội dung |
|---|---|
| `matches` | Match state, metadata, player credentials |
| `initial_state` | Initial G cho mỗi match (để reset/replay) |

Không cần tự tạo hoặc query các bảng này — boardgame.io lo.

---

## 3. Bảng do mình thêm (logging)

### `game_records`
```sql
CREATE TABLE game_records (
    id              TEXT PRIMARY KEY,       -- matchID từ boardgame.io
    game_mode       TEXT NOT NULL,
    total_players   INTEGER NOT NULL,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ,
    winner_name     TEXT,
    status          TEXT NOT NULL DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress', 'finished', 'cancelled'))
);
```

### `player_records`
```sql
CREATE TABLE player_records (
    id                  SERIAL PRIMARY KEY,
    match_id            TEXT NOT NULL REFERENCES game_records(id),
    guest_id            TEXT NOT NULL,
    display_name        TEXT NOT NULL,
    seat_index          INTEGER NOT NULL,
    disorders_cured     INTEGER NOT NULL DEFAULT 0,
    disorders_remaining INTEGER NOT NULL DEFAULT 0,
    joined_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `turn_logs`
```sql
CREATE TABLE turn_logs (
    id              SERIAL PRIMARY KEY,
    match_id        TEXT NOT NULL REFERENCES game_records(id),
    turn_number     INTEGER NOT NULL,
    player_name     TEXT NOT NULL,
    action_type     TEXT NOT NULL
                    CHECK (action_type IN ('drug', 'therapy', 'episode', 'pass', 'side_effect_react')),
    card_slug       TEXT,
    target_name     TEXT,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `chat_logs`
```sql
CREATE TABLE chat_logs (
    id          SERIAL PRIMARY KEY,
    match_id    TEXT NOT NULL,
    guest_id    TEXT NOT NULL,
    display_name TEXT NOT NULL,
    message     TEXT NOT NULL,
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. Index

```sql
CREATE INDEX idx_turn_logs_match  ON turn_logs(match_id, turn_number);
CREATE INDEX idx_chat_logs_match  ON chat_logs(match_id, timestamp);
CREATE INDEX idx_player_match     ON player_records(match_id);
```

---

## 5. Kết nối — `server/src/db/client.js`

```javascript
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,           // Render free tier giới hạn connection
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
});

export async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const res = await client.query(sql, params);
    return res.rows;
  } finally {
    client.release();
  }
}
```

Mọi query dùng parameterized (`$1`, `$2`, ...). Không format string SQL trực tiếp.

---

## 6. Schema init

```javascript
// server/src/db/schema.sql  — chạy 1 lần khi deploy
// npm run db:init → node -e "require('./src/db/init.js')"
```

```javascript
// server/src/db/init.js
import { readFileSync } from "fs";
import { query } from "./client.js";

const schema = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
await query(schema);
console.log("Schema initialized.");
```

---

## 7. Ghi log sau ván

boardgame.io gọi `onEnd` khi ván kết thúc — hook này ghi vào PostgreSQL:

```javascript
// server/src/game/PsycheWard.js
onEnd: async (G, ctx) => {
  if (!ctx.gameover) return;
  await logGameEnd(ctx.matchID, G, ctx.gameover);
}
```

```javascript
// server/src/db/gameLogger.js
export async function logGameEnd(matchID, G, gameover) {
  await query(
    `UPDATE game_records SET ended_at = NOW(), winner_name = $1, status = 'finished' WHERE id = $2`,
    [gameover.winner ?? null, matchID]
  );
  for (const p of G.players) {
    await query(
      `UPDATE player_records SET disorders_remaining = $1 WHERE match_id = $2 AND seat_index = $3`,
      [p.psyche.length, matchID, Number(p.id)]
    );
  }
}
```
