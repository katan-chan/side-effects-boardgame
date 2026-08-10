# 08 - Infrastructure — PsycheWard

## 1. Hosting

| Thành phần | Host | Gói |
|---|---|---|
| Game Server (boardgame.io + Express) | Render | Free (512MB RAM, 0.1 vCPU) |
| Frontend (React build) | Cloudflare Pages | Free |
| Database (PostgreSQL) | Render | Free (1GB, 90 ngày expire nếu không active) |
| Keep-alive Worker | Cloudflare Workers | Free |

**Giới hạn thực tế với Render free:**
- Spin down sau 15 phút không có HTTP request → giải quyết bằng CF Worker ping.
- Render free PostgreSQL expire sau 90 ngày không active → cần ping DB hoặc upgrade.
- Phù hợp cho 1–2 phòng, ~16 người cùng lúc.

> **Render free PostgreSQL lưu ý:** Sau 90 ngày không có query → DB bị suspend. Giải pháp: thêm cron job ping `SELECT 1` hàng tuần, hoặc dùng Supabase free tier (không expire, 500MB).

---

## 2. Cloudflare Worker — Keep-alive ping

```javascript
// keep_alive/worker.js
export default {
  async scheduled(event, env, ctx) {
    const res = await fetch(env.BACKEND_URL + "/health");
    if (!res.ok) console.error("Health check failed:", res.status);
  },
};
```

```toml
# keep_alive/wrangler.toml
name = "psycheward-keepalive"
main = "worker.js"
compatibility_date = "2024-01-01"

[triggers]
crons = ["*/10 * * * *"]

[vars]
BACKEND_URL = "https://your-app.onrender.com"
```

---

## 3. Load check

```javascript
// server/src/lobby/router.js
import os from "os";

function canAcceptConnection() {
  if (process.env.DEV_MODE === "true") {
    console.debug("[DEV MODE] load check skipped");
    return true;
  }
  const freeMemMB = os.freemem() / 1_000_000;
  const totalMemMB = os.totalmem() / 1_000_000;
  const memUsedPercent = ((totalMemMB - freeMemMB) / totalMemMB) * 100;
  return memUsedPercent < 80;
}
```

> **Ghi chú:** Node.js không có `psutil` như Python. Dùng `os.freemem()` / `os.totalmem()` thay thế. CPU check phức tạp hơn (cần sample) — ở đây chỉ check RAM là đủ cho use case này.

Khi `canAcceptConnection()` trả `false`:
> *"Bệnh viện đang quá tải rồi 🏥 Vui lòng thử lại sau vài phút!"*

---

## 4. Môi trường phát triển

### Windows (môi trường chính)

```powershell
# Clone project
git clone https://github.com/your-org/psycheward.git
cd psycheward

# Server setup
cd server
npm install
copy .env.example .env
# Chỉnh .env:
#   DATABASE_URL=postgresql://localhost:5432/psycheward
#   CLIENT_URL=http://localhost:5173
#   DEV_MODE=true
#   PORT=8000

# Khởi tạo DB schema (PostgreSQL phải đang chạy)
npm run db:init

# Chạy server (với hot reload)
npm run dev
# → http://localhost:8000 (boardgame.io server)
# → http://localhost:8000/lobby (lobby API)

# Client setup (terminal khác)
cd ../client
npm install
copy .env.example .env
# Chỉnh .env:
#   VITE_SERVER_URL=http://localhost:8000

npm run dev
# → http://localhost:5173
```

**PostgreSQL local trên Windows:**
- Cài [PostgreSQL installer](https://www.postgresql.org/download/windows/) hoặc dùng Docker:
  ```powershell
  docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=psycheward postgres:16
  ```

> **PowerShell execution policy:** Nếu gặp lỗi khi chạy scripts:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

### macOS (tham khảo)

```bash
cd server && npm install && cp .env.example .env
# PostgreSQL: brew install postgresql@16 && brew services start postgresql@16
# createdb psycheward
npm run db:init && npm run dev

cd ../client && npm install && cp .env.example .env && npm run dev
```

### Linux (tham khảo)

```bash
cd server && npm install && cp .env.example .env
# PostgreSQL: sudo apt install postgresql && sudo service postgresql start
# sudo -u postgres createdb psycheward
npm run db:init && npm run dev

cd ../client && npm install && cp .env.example .env && npm run dev
```

---

## 5. Scripts (`server/package.json`)

```json
{
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js",
    "db:init": "node src/db/init.js",
    "db:reset": "node src/db/reset.js"
  }
}
```

> `node --watch` (Node 18+) thay cho `nodemon` — không cần install thêm package.

---

## 6. Environment variables

### Server (`.env`)

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/psycheward

# Server
PORT=8000
CLIENT_URL=http://localhost:5173    # hoặc https://psycheward.pages.dev

# Dev
DEV_MODE=false                      # true → bỏ load check, bật debug logs
NODE_ENV=development                # production trên Render

# Encryption (cho snapshot nếu cần)
ENCRYPTION_KEY=your-32-char-secret-here
```

### Client (`.env`)

```env
VITE_SERVER_URL=http://localhost:8000
# Production: VITE_SERVER_URL=https://your-app.onrender.com
```

---

## 7. Deploy lên Render

```
# Server (Web Service)
Build command:  cd server && npm install
Start command:  cd server && node src/index.js
Environment:    NODE_ENV=production, DATABASE_URL=..., CLIENT_URL=...

# PostgreSQL (Database)
→ Tạo riêng trên Render → copy DATABASE_URL vào server env
```

```
# Client (Cloudflare Pages)
Build command:  cd client && npm install && npm run build
Output dir:     client/dist
Environment:    VITE_SERVER_URL=https://your-app.onrender.com
```

---

## 8. Logging

```javascript
// server/src/utils/logger.js
const LOG_LEVEL = process.env.DEV_MODE === "true" ? "debug" : "info";

export const logger = {
  debug: (...args) => LOG_LEVEL === "debug" && console.debug("[DEBUG]", ...args),
  info:  (...args) => console.info("[INFO ]", ...args),
  warn:  (...args) => console.warn("[WARN ]", ...args),
  error: (...args) => console.error("[ERROR]", ...args),
};
```

Render free tier không hỗ trợ file logging → log ra stdout, Render capture và hiển thị trong dashboard.

Ví dụ log:
```
[INFO ] [ABC123] Game started — 4 players, Standard mode
[INFO ] [ABC123/CrazyNurse] MOVE playDrug card=prozac target=anxiety
[INFO ] [ABC123] Disorder cured seat=0 remaining=3
[WARN ] [ABC123] Player DrowsyMedic AFK — auto-pass
[INFO ] [ABC123] GAME_END winner=CrazyNurse turns=47
```
