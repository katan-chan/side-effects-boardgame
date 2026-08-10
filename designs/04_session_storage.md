# 04 - Session & Storage — PsycheWard

## 1. Tổng quan

PsycheWard không có hệ thống đăng nhập. Định danh người chơi dựa trên **guest session** lưu trong `localStorage` của trình duyệt. Không có tài khoản, không có password, không có cookie auth.

---

## 2. Guest Session

### Cấu trúc localStorage

```json
{
  "guest_id": "uuid-v4-here",
  "display_name": "CrazyNurse#4821",
  "last_seen": "2025-08-10T14:30:00Z"
}
```

| Field | Mô tả |
|---|---|
| `guest_id` | UUID v4, tạo một lần, dùng mãi cho đến khi hết hạn |
| `display_name` | Tên hiển thị trong game — người dùng có thể đổi bất kỳ lúc nào (ngoài ván) |
| `last_seen` | ISO 8601 timestamp, cập nhật mỗi lần truy cập |

### Rolling expiry: 14 ngày

`useGuestSession.js` chạy khi app load:

```javascript
const EXPIRY_DAYS = 14;

function loadOrCreateGuestSession() {
    const raw = localStorage.getItem('psycheward_guest');
    if (raw) {
        const session = JSON.parse(raw);
        const lastSeen = new Date(session.last_seen);
        const daysSince = (Date.now() - lastSeen) / (1000 * 60 * 60 * 24);
        if (daysSince < EXPIRY_DAYS) {
            // còn hạn → refresh last_seen và dùng tiếp
            session.last_seen = new Date().toISOString();
            localStorage.setItem('psycheward_guest', JSON.stringify(session));
            return session;
        }
    }
    // hết hạn hoặc chưa có → tạo mới
    return createNewGuestSession();
}

function createNewGuestSession() {
    const session = {
        guest_id: crypto.randomUUID(),
        display_name: generateRandomName(),   // xem §2.1
        last_seen: new Date().toISOString(),
    };
    localStorage.setItem('psycheward_guest', JSON.stringify(session));
    return session;
}
```

### 2.1 Tên tự động (Name Pool)

```javascript
const ADJECTIVES = [
    'Crazy', 'Anxious', 'Paranoid', 'Drowsy', 'Manic',
    'Bipolar', 'Jittery', 'Zoned', 'Glitchy', 'Foggy',
    'Restless', 'Scattered', 'Numb', 'Frantic', 'Dazed',
];

const NOUNS = [
    'Nurse', 'Doctor', 'Patient', 'Intern', 'Orderly',
    'Shrink', 'Pharmacist', 'Therapist', 'Resident', 'Medic',
];

function generateRandomName() {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const id = Math.floor(1000 + Math.random() * 9000); // 4 số
    return `${adj}${noun}#${id}`;
}
// VD: "CrazyNurse#4821", "ParanoidShrink#7302"
```

### 2.2 Đổi tên

- Người chơi có thể đổi tên bất kỳ lúc nào **ngoài ván đang chơi**.
- Khi đang trong phòng chờ: đổi tên → gửi event `RENAME` → server broadcast `ROOM_UPDATE` với tên mới.
- Không được đổi tên trong ván (để tránh nhầm lẫn).
- Ràng buộc tên: 2–20 ký tự, không thuần số, không có ký tự đặc biệt ngoài `#_-`.

---

## 3. WebSocket Authentication

Không có JWT. Thay vào đó, `guest_id` gửi qua WebSocket query param khi kết nối:

```
ws://host/ws/{room_code}?guest_id={uuid}&display_name={name}
```

Backend validate:
- `guest_id` phải là UUID v4 hợp lệ.
- `display_name` phải tuân thủ ràng buộc tên.
- `room_code` phải là phòng đang chờ hoặc đang chơi.

Không cần verify `guest_id` với database — chỉ dùng để định danh trong phòng. Nếu ai reconnect với cùng `guest_id` → coi là cùng 1 người.

---

## 4. Session trên Backend

Backend không lưu session vào D1. Toàn bộ mapping `guest_id → player` chỉ sống trong RAM (trong `GameState` và `room_manager`). Khi server restart, session mất — nhưng snapshot chứa `guest_id` nên khi Host resume, người chơi reconnect với cùng `guest_id` sẽ được map lại đúng slot.

---

## 5. Thay đổi endpoint so với bản Ma Sói

| Ma Sói | PsycheWard | Ghi chú |
|---|---|---|
| `POST /auth/register` | `POST /session/init` | Tạo/validate guest session |
| `POST /auth/login` | *(không có)* | Không cần đăng nhập |
| `POST /auth/logout` | *(không có)* | Không cần đăng xuất |
| `GET /me` | `GET /session/me` | Trả về display_name, guest_id |
| — | `PATCH /session/rename` | Đổi tên |

`POST /session/init` nhận `{ guest_id?, display_name? }`:
- Nếu `guest_id` đã tồn tại và hợp lệ → trả về confirm.
- Nếu không có → backend không cần làm gì, chỉ FE tự generate.
- Endpoint này optional — FE có thể hoàn toàn tự quản lý localStorage mà không cần gọi backend.
