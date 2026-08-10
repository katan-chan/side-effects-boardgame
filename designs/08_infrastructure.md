# 08 - Infrastructure — PsycheWard

## 1. Hosting

| Thành phần | Host | Gói |
|---|---|---|
| Backend (FastAPI) | Render | Free (512MB RAM, 0.1 vCPU) |
| Frontend (React build) | Cloudflare Pages | Free |
| Database (D1) | Cloudflare | Free |
| Keep-alive Worker | Cloudflare Workers | Free |

**Giới hạn thực tế với Render free:**
- Spin down sau 15 phút không có HTTP request → giải quyết bằng CF Worker ping (§2).
- Restart bất ngờ mất RAM state → giải quyết bằng game snapshot vào D1 (xem `03_game_engine.md` §8).
- Phù hợp cho 1–2 phòng, tối đa ~16 người cùng lúc. CPU 0.1 vCPU đủ cho use case này.

---

## 2. Cloudflare Worker — Keep-alive ping

### Vấn đề
Render free spin down sau 15 phút không có HTTP request. WebSocket connection đang mở **không tính** là activity — giữa ván chơi server vẫn có thể ngủ và WebSocket đứt.

### Giải pháp
CF Worker Cron chạy mỗi **10 phút**, gọi `GET /health` trên Render.

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

`/health` endpoint trên BE:
```python
@app.get("/health")
async def health():
    return {"status": "ok"}
```

CF Worker free: 100,000 request/ngày. Ping 10 phút/lần = ~144/ngày — trong giới hạn.

---

## 3. Load check

```python
import psutil

def can_accept_connection() -> bool:
    ram_ok = psutil.virtual_memory().percent < 80
    cpu_ok = psutil.cpu_percent(interval=0.1) < 85
    return ram_ok and cpu_ok
```

**Dev mode:** Khi `DEV_MODE=true` trong `.env`, **bỏ qua hoàn toàn** load check — không có giới hạn phòng, không có giới hạn người chơi. Log rõ `[DEV MODE] load check skipped` để không nhầm lẫn khi review log production.

```python
def can_accept_connection() -> bool:
    if settings.DEV_MODE:
        logger.debug("[DEV MODE] load check skipped")
        return True
    ram_ok = psutil.virtual_memory().percent < 80
    cpu_ok = psutil.cpu_percent(interval=0.1) < 85
    return ram_ok and cpu_ok
```

---

## 4. Thông báo quá tải

Khi `can_accept_connection()` trả `False`:

> *"Bệnh viện đang quá tải rồi 🏥 Server tội nghiệp của chúng tôi đang chăm sóc quá nhiều bệnh nhân cùng lúc. Vui lòng thử lại sau vài phút!"*

Variant ngắn (toast):
> *"Server đang bận trị bệnh cho người khác 😵 Thử lại sau nhé!"*

FE hiển thị dưới dạng toast — không redirect, không crash.

---

## 5. Môi trường phát triển

### Windows (môi trường chính)

```powershell
# Clone project
git clone https://github.com/your-org/psycheward.git
cd psycheward

# Backend setup
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# Chỉnh .env: D1_ACCOUNT_ID, D1_DATABASE_ID, D1_API_TOKEN, DEV_MODE=true

# Chạy backend
uvicorn main:app --reload --port 8000

# Frontend setup (terminal khác)
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

> **Lưu ý PowerShell:** Nếu gặp lỗi "execution policy" khi chạy `Activate.ps1`:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

### macOS/Linux (tham khảo)

```bash
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

> **macOS note:** Nếu dùng Homebrew Python, đảm bảo `python3` là 3.10+: `python3 --version`.
> **Linux note:** Trên Ubuntu/Debian cần `python3-venv`: `sudo apt install python3-venv`.

---

## 6. Logging

Mọi event quan trọng ghi ra stdout và file `backend/logs/YYYY-MM-DD.log`.

### Format

```
[HH:MM:SS] [LEVEL] [context] message
```

Ví dụ:
```
[14:32:11] [INFO ] [room:ABC123] Game started — 4 players, Standard mode
[14:32:45] [INFO ] [ABC123/CrazyNurse] PLAY_DRUG card=prozac target=anxiety
[14:32:45] [INFO ] [ABC123] DISORDER_CURED seat=0 disorder=anxiety remaining=3
[14:32:45] [INFO ] [ABC123] SIDE_EFFECT_WINDOW_OPEN duration=10s types=[insomnia,mania]
[14:32:52] [INFO ] [ABC123/ParanoidShrink] SIDE_EFFECT_REACT disorder=insomnia target=CrazyNurse
[14:33:01] [INFO ] [ABC123] TURN_END seat=0 → seat=1
[14:35:22] [INFO ] [ABC123] GAME_END winner=CrazyNurse turns=47
[14:35:22] [WARN ] [ABC123] Room cleanup scheduled
```

### Level

| Level | Dùng cho |
|---|---|
| `DEBUG` | Raw WebSocket payload, D1 query params |
| `INFO` | Turn boundaries, card actions, game events |
| `WARN` | Server overload từ chối, AFK timeout, game cancelled |
| `ERROR` | D1 connection fail, snapshot decrypt fail, invalid event |

Console: `INFO` trở lên. File log: tất cả kể cả `DEBUG`.
