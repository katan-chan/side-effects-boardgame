# 03 - Game Engine — PsycheWard

## 1. Ngôn ngữ

Mọi văn bản hiển thị trong game bằng **tiếng Việt**. Tên biến, class, function trong code dùng tiếng Anh.

---

## 2. Vòng đời một ván

```
Tạo phòng → Chờ người vào → Host cấu hình → Tất cả sẵn sàng → Bắt đầu
    → Chia thẻ ban đầu (Disorder face-up + Hand face-down)
    → Game-start info block (công khai)
    → [Lượt người chơi × N] × nhiều vòng
    → Ai đó trị hết bệnh → Kết thúc
```

### Chia thẻ ban đầu

- Deck được xáo trộn.
- Mỗi người nhận **4 Disorder cards** ngửa mặt lên (psyche) — mọi người đều thấy bạn đang bệnh gì.
- Mỗi người nhận **4 thẻ bài** úp xuống vào tay (hand) — chỉ bạn thấy bài của mình.
- Thứ tự đi đầu tiên: ngẫu nhiên, công bố trước khi bắt đầu.

### Game-start info block

Sau khi chia thẻ, hệ thống post 1 block thông tin công khai vào chat feed:

```
=== BẮT ĐẦU VÁN ===
Chế độ: Standard · 4 người chơi
Số Disorder ban đầu: 4
Thứ tự đi: [Tên1] → [Tên2] → [Tên3] → [Tên4]
Người đi đầu: [Tên1]
```

---

## 3. Cấu trúc 1 lượt đi

```
Bắt đầu lượt
  └─ 1. Rút thẻ (bắt buộc)
  └─ 2. Hành động chính (chọn 1):
         a. Dùng Drug card → trị Disorder trong psyche
         b. Dùng Therapy card → hiệu ứng đặc biệt
         c. Dùng Episode card → nhắm vào người khác
         d. Pass (không làm gì)
  └─ 3. Side effect window (nếu dùng Drug):
         → Người khác có thể phản ứng (thêm Disorder mới vào psyche bạn)
         → Thời gian: 10 giây hoặc tất cả đã quyết định
  └─ 4. Kiểm tra thắng thua
  └─ 5. Kiểm tra giới hạn tay (bỏ bớt nếu > max)
  └─ 6. Chuyển lượt
```

### 3.1 Rút thẻ

- Rút 1 thẻ từ đầu deck (Standard/Chaos rút 2).
- Thẻ rút thêm vào hand — không công khai với người khác.
- Nếu deck hết → xáo trộn discard pile thành deck mới.

### 3.2 Hành động chính

**a. Dùng Drug card:**

1. Chọn Drug card từ tay.
2. Chọn Disorder trong **psyche của mình** cần trị.
3. Validate: `drug.drug_type` phải khớp với `disorder.cure_drug_type` (hoặc `potency = 3` thì khớp bất kỳ).
4. Nếu hợp lệ: Disorder bị trị → lật úp hoặc remove khỏi psyche (theo cài đặt `reveal_on_cure`).
5. Drug card vào discard pile.
6. Mở **Side Effect Window** (xem §3.3).

> Potency 2: trị 2 Disorder cùng loại cùng lúc (nếu có). Potency 3: trị bất kỳ 1 Disorder.

**b. Dùng Therapy card:**

1. Chọn Therapy card từ tay.
2. Áp dụng hiệu ứng theo `therapy.slug` (xem `01_cards.md`).
3. Therapy card vào discard pile.
4. Không có Side Effect Window sau Therapy.

**c. Dùng Episode card:**

1. Chọn Episode card từ tay.
2. Chọn người chơi khác làm mục tiêu.
3. Validate: mục tiêu phải còn sống (trong ván) và **còn ít nhất 1 Disorder trong psyche**.
4. Người chơi bị mục tiêu chọn **Disorder nào bị kích hoạt** (nếu có nhiều lựa chọn, FE cho chọn — có timeout 10 giây, hệ thống tự chọn ngẫu nhiên nếu không chọn).
5. Hình phạt của Disorder đó được thực thi + bonus effect của Episode (nếu có).
6. Episode card vào discard pile.

> **Lưu ý quan trọng:** Người chơi đã bị loại (disconnected vĩnh viễn hoặc đã thắng — không áp dụng cho game này vì chỉ 1 người thắng) **không được chọn làm mục tiêu Episode**. FE disable lựa chọn đó + BE validate.

**d. Pass:**

Không làm gì. Không có penalty.

### 3.3 Side Effect Window

Sau khi người chơi dùng Drug card thành công, mở một cửa sổ **10 giây** (cấu hình được: 5–15 giây):

- Hệ thống broadcast công khai: `"[Tên] vừa dùng [Thuốc]. Side effects: [loại bệnh A], [loại bệnh B]"`
- Trong 10 giây này, **mỗi người chơi khác** có thể chọn:
  - **Phản ứng:** thêm 1 Disorder (loại khớp với side effects của thuốc vừa dùng) từ discard pile hoặc deck vào psyche của người vừa dùng thuốc.
  - **Bỏ qua:** không làm gì.
- Mỗi người chỉ được phản ứng **1 lần** per Side Effect Window.
- Hết 10 giây hoặc tất cả đã quyết định → đóng window, tiếp tục lượt.

```
Side Effect Window — đang chờ phản ứng (7s còn lại)
  [Bỏ 1 Disorder vào psyche Tên] [Bỏ qua]
```

### 3.4 Bỏ bớt bài (hand limit)

Sau khi kết thúc hành động chính:
- Đếm số thẻ trên tay.
- Nếu > `max_hand_size` (mặc định 7): phải bỏ bớt xuống còn đúng giới hạn.
- FE hiển thị prompt chọn thẻ bỏ. Timeout 10 giây → bỏ ngẫu nhiên nếu không chọn.

---

## 4. Trạng thái "Hở" (Vulnerable State)

Sau khi dùng Drug, người chơi ở trạng thái "hở" cho đến đầu lượt tiếp theo của mình. Trong trạng thái này:
- **Không thêm giới hạn** ngoài việc người khác có thể phản ứng qua Side Effect Window.
- Therapy card `meditation` hoặc `self_care` hủy trạng thái hở sớm.
- Trạng thái hở hiển thị rõ trên UI (icon nhỏ trên card khu vực của người đó).

---

## 5. Điều kiện thắng & thua

### Thắng

Kiểm tra **ngay sau mỗi lần trị bệnh thành công**:
- Nếu psyche của người chơi còn **0 Disorder** → người đó thắng ngay lập tức.
- Ván kết thúc, broadcast `GAME_END` với tên người thắng.

### Hòa (không có)

Game không có điều kiện hòa. Nếu deck cạn và không ai có thể hành động → ván tiếp tục đến khi deck rebuild xong (từ discard pile).

### Kết thúc ván

Khi có người thắng:
1. Broadcast `GAME_END` với `winner_name` và `final_psyche` của tất cả (công khai hoàn toàn).
2. Chat feed hiển thị bảng xếp hạng: số Disorder còn lại của mỗi người (ít hơn = gần thắng hơn).
3. Hiển thị nút **Chơi lại** (tạo phòng mới với cùng người chơi) và **Về trang chủ**.

---

## 6. Xử lý timeout lượt

Mỗi lượt có timer tối đa (mặc định 60 giây, Host chỉnh được).

- **0–60s:** Người chơi thực hiện hành động.
- **Hết giờ:** Tự động **Pass** — rút thẻ đã thực hiện nhưng không có hành động chính.
- Timer hiển thị đồng hồ đếm ngược trên UI, chuyển màu đỏ khi < 10 giây.

---

## 7. Xử lý mất kết nối

- Mất kết nối → server chờ **30 giây** trước khi đánh dấu AFK.
- Trong 30 giây: người chơi có thể reconnect và tiếp tục, game không dừng.
- Sau 30 giây AFK: lượt của người AFK tự động Pass. Game tiếp tục.
- Nếu < 2 người kết nối trong 5 phút: ván tạm dừng → chờ thêm 5 phút → hủy ván nếu không đủ người.
- Khi reconnect: nhận lại `GAME_STATE_SYNC` với toàn bộ state hiện tại (hand riêng tư + psyche công khai của tất cả + chat history).

---

## 8. Game state persistence & Resume

### Thời điểm lưu

Snapshot sau mỗi lượt hoàn chỉnh (sau bước 6 — chuyển lượt):

```
Cuối lượt → checkpoint "turn_end"
```

### Nội dung snapshot

```python
@dataclass
class GameSnapshot:
    game_id: str
    room_code: str
    turn_number: int
    current_player_index: int
    phase: str                    # 'draw' | 'action' | 'side_effect' | 'discard'
    players: list[PlayerState]
    # PlayerState: guest_id, seat_index, display_name, hand (riêng tư), psyche (công khai), is_vulnerable, is_afk
    deck: list[str]               # card slugs còn trong deck (thứ tự)
    discard_pile: list[str]
    game_settings: dict
    saved_at: str
```

Snapshot **encrypt AES-256** trước khi ghi (vì chứa hand riêng tư của từng người).

### Resume flow

```
Server restart
  → Load snapshot gần nhất
  → Rebuild GameState trong RAM
  → WebSocket mở lại, chờ reconnect
  → Khi Host reconnect → thấy banner "Ván đang tạm dừng" + nút [Resume]
  → Host nhấn Resume → broadcast PHASE_CHANGE, ván tiếp tục
```

---

## 9. Resolver — logic cốt lõi

```python
# resolver.py

def resolve_drug_action(game_state, player, drug_card, target_disorder):
    # validate drug type matches disorder
    if not can_cure(drug_card, target_disorder):
        return ActionResult(success=False, reason="drug_mismatch")

    # remove disorder from psyche
    player.psyche.remove(target_disorder)
    game_state.discard(drug_card)

    # open side effect window
    side_effects = drug_card.side_effects
    game_state.open_side_effect_window(player, side_effects, duration=10)

    # check win condition immediately
    if len(player.psyche) == 0:
        return ActionResult(success=True, winner=player)

    return ActionResult(success=True, side_effects_open=True)


def resolve_episode_action(game_state, player, episode_card, target_player, target_disorder):
    # validate target is still active
    if not target_player.is_active:
        return ActionResult(success=False, reason="invalid_target")

    # validate target has the disorder
    if target_disorder not in target_player.psyche:
        return ActionResult(success=False, reason="disorder_not_found")

    # trigger disorder punishment
    apply_punishment(game_state, target_player, target_disorder)

    # apply episode bonus effect
    apply_episode_bonus(game_state, episode_card, player, target_player)

    game_state.discard(episode_card)
    return ActionResult(success=True)
```
