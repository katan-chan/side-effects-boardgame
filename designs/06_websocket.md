# 06 - WebSocket Events — PsycheWard

## 1. Tổng quan

Mọi giao tiếp realtime qua WebSocket. Endpoint: `ws://{host}/ws/{room_code}?guest_id={uuid}&display_name={name}`.

Tất cả event shape thống nhất:
```json
{ "type": "EVENT_TYPE", "payload": { ... } }
```

Event types định nghĩa trong `backend/ws/events.py` và mirror ở `frontend/src/config/wsEvents.js`.

---

## 2. Server → Client

### Phòng chờ

| Event | Gửi tới | Payload |
|---|---|---|
| `ROOM_UPDATE` | Broadcast phòng | `players: [{seat_index, display_name, is_ready, is_host}]`, `settings: RoomConfig` |
| `SERVER_OVERLOAD` | 1 người (đang join) | `message: string` |
| `ROOM_SETTINGS_UPDATE` | Broadcast | `settings: RoomConfig` — khi Host thay đổi tùy chọn |

### Bắt đầu ván

| Event | Gửi tới | Payload |
|---|---|---|
| `GAME_START` | Broadcast | `total_players`, `game_mode`, `turn_order: [display_name]`, `first_player: display_name` |
| `HAND_DEALT` | Riêng tư (1 người) | `hand: [CardMeta]` — bài trên tay ban đầu |
| `PSYCHE_DEALT` | Broadcast | `psyches: [{seat_index, disorders: [CardMeta]}]` — psyche của tất cả mọi người |

### Lượt đi

| Event | Gửi tới | Payload |
|---|---|---|
| `TURN_START` | Broadcast | `seat_index`, `display_name`, `turn_number`, `timeout_seconds` |
| `CARD_DRAWN` | Riêng tư (người đang đi) | `card: CardMeta` |
| `DECK_RESHUFFLED` | Broadcast | `discard_count` — thông báo deck được xáo lại |

### Hành động

| Event | Gửi tới | Payload |
|---|---|---|
| `ACTION_DRUG` | Broadcast | `player_name`, `drug_name`, `disorder_cured` (nếu `reveal_on_cure` bật), `side_effects: [disorder_type]` |
| `ACTION_THERAPY` | Broadcast | `player_name`, `therapy_name`, `effect_summary` |
| `ACTION_EPISODE` | Broadcast | `player_name`, `episode_name`, `target_name`, `disorder_triggered` |
| `ACTION_PASS` | Broadcast | `player_name` |

### Side Effect Window

| Event | Gửi tới | Payload |
|---|---|---|
| `SIDE_EFFECT_WINDOW_OPEN` | Broadcast | `target_player_name`, `vulnerable_types: [disorder_type]`, `duration_seconds: 10` |
| `SIDE_EFFECT_REACTION` | Broadcast | `reactor_name`, `disorder_added`, `target_name` |
| `SIDE_EFFECT_WINDOW_CLOSE` | Broadcast | `disorders_added_count` |

### Psyche & Hand updates

| Event | Gửi tới | Payload |
|---|---|---|
| `PSYCHE_UPDATE` | Broadcast | `seat_index`, `psyche: [CardMeta]` — sau mỗi thay đổi (trị bệnh hoặc thêm bệnh) |
| `HAND_UPDATE` | Riêng tư (1 người) | `hand: [CardMeta]` — sau khi rút thẻ, dùng thẻ, bỏ thẻ |
| `DISCARD_PROMPT` | Riêng tư (1 người) | `must_discard: int`, `timeout_seconds: 10` — khi tay > max |

### Kết thúc ván

| Event | Gửi tới | Payload |
|---|---|---|
| `GAME_END` | Broadcast | `winner_name`, `final_standings: [{name, disorders_remaining}]` |

### Kết nối & Host

| Event | Gửi tới | Payload |
|---|---|---|
| `PLAYER_DISCONNECTED` | Broadcast | `seat_index`, `display_name`, `afk_countdown_seconds: 30` |
| `PLAYER_RECONNECTED` | Broadcast | `seat_index`, `display_name` |
| `HOST_TRANSFERRED` | Broadcast | `new_host_name` |
| `RESUME_AVAILABLE` | Riêng tư (Host) | `room_code`, `turn_number` |
| `GAME_STATE_SYNC` | Riêng tư (người reconnect) | `hand`, `all_psyches`, `chat_history`, `current_turn`, `time_remaining_seconds` |

### Chat

| Event | Gửi tới | Payload |
|---|---|---|
| `CHAT_MESSAGE` | Broadcast | `display_name`, `text`, `timestamp` |

---

## 3. Client → Server

### Phòng chờ

| Event | Gửi khi | Payload |
|---|---|---|
| `READY` | Nhấn Sẵn sàng | — |
| `UNREADY` | Nhấn Hủy sẵn sàng | — |
| `START_GAME` | Host bắt đầu | — |
| `LEAVE_ROOM` | Nhấn Thoát phòng | — |
| `RENAME` | Đổi tên | `new_name: string` |
| `UPDATE_SETTINGS` | Host lưu tùy chọn | `settings: Partial<RoomConfig>` |

### Trong ván

| Event | Gửi khi | Payload |
|---|---|---|
| `PLAY_DRUG` | Dùng Drug card | `card_slug: string`, `target_disorder_slug: string` |
| `PLAY_THERAPY` | Dùng Therapy card | `card_slug: string`, `target_seat_index?: int` |
| `PLAY_EPISODE` | Dùng Episode card | `card_slug: string`, `target_seat_index: int` |
| `CHOOSE_DISORDER` | Chọn Disorder bị Episode kích hoạt | `disorder_slug: string` |
| `SIDE_EFFECT_REACT` | Phản ứng trong Side Effect Window | `disorder_slug: string` — loại Disorder muốn thêm vào mục tiêu |
| `SIDE_EFFECT_SKIP` | Bỏ qua Side Effect Window | — |
| `DISCARD_CARD` | Bỏ thẻ khi tay > max | `card_slug: string` |
| `PASS_TURN` | Pass | — |

### Chat

| Event | Gửi khi | Payload |
|---|---|---|
| `CHAT` | Gửi tin nhắn | `text: string` |

### Misc

| Event | Gửi khi | Payload |
|---|---|---|
| `RESUME_GAME` | Host nhấn Resume | — |

---

## 4. Validation

Mọi event từ client đều được **validate phía BE**:
- Đúng lượt (chỉ người đang đến lượt mới gửi `PLAY_*` và `PASS_TURN`).
- Card hợp lệ (card slug tồn tại trong hand của người đó).
- Target hợp lệ (target_seat_index phải là người còn active và có Disorder trong psyche — không phải người đã bị loại).
- Side Effect reaction chỉ hợp lệ trong Side Effect Window đang mở.

FE cũng disable các action không hợp lệ — BE là lớp validation cuối cùng.

> **Lưu ý sửa lỗi:** Người chơi đã bị loại (AFK quá lâu) **không được nhắm bởi Episode cards**. BE validate `target_player.is_active == True` trước khi resolve. FE lọc danh sách target, không hiển thị người không active.
