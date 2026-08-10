# 09 - Code Style — PsycheWard

## 1. Ngôn ngữ

| Ngữ cảnh | Ngôn ngữ |
|---|---|
| Giao tiếp với người dùng (UI text, thông báo, toast, banner) | Tiếng Việt |
| Code: tên biến, hàm, class, file, module | Tiếng Anh |
| Comment trong code | Tiếng Anh |
| Tài liệu thiết kế (các file .md này) | Tiếng Việt |

---

## 2. Comment

**Nguyên tắc: tối thiểu hóa.** Code tốt tự giải thích được. Comment chỉ xuất hiện khi thực sự cần.

**Không cần:**
- Summary đầu file
- Docstring đầy đủ cho từng function
- Comment giải thích code đơn giản

**Nên có:**
- Comment ngắn 1 dòng cho hàm dài và phức tạp — giải thích *tại sao*, không phải *cái gì*
- Comment cho logic không hiển nhiên
- `# TODO:` hoặc `# FIXME:` khi có điểm cần quay lại

**Ví dụ đúng:**
```python
# wait full window duration even if all players responded — early close leaks reaction timing
await asyncio.sleep(remaining)

def resolve_drug_action(game_state, player, drug_card, target_disorder):
    # potency 3 = wildcard, matches any disorder type
    if drug_card.potency == 3 or drug_card.drug_type == target_disorder.cure_drug_type:
        ...
```

---

## 3. Tách hàm

**Nguyên tắc: 1 hàm làm 1 việc.**

- Nếu cần mô tả hàm bằng "và", đó là dấu hiệu cần tách.
- Hàm dài hơn ~30–40 dòng nên xem lại.

**Ví dụ cấu trúc đúng (`resolver.py`):**

```python
def resolve_drug_action(game_state, player, drug_card, target_disorder):
    if not can_cure(drug_card, target_disorder):
        return ActionResult(success=False, reason="drug_mismatch")
    apply_cure(player, target_disorder)
    open_side_effect_window(game_state, player, drug_card)
    return check_win_condition(game_state, player)

def can_cure(drug_card, disorder): ...
def apply_cure(player, disorder): ...
def open_side_effect_window(game_state, player, drug_card): ...
def check_win_condition(game_state, player): ...
```

---

## 4. Đặt tên

**Rõ ràng hơn ngắn gọn.**

```python
# Sai
def chk(p, c): ...
dis = get_d(slug)

# Đúng
def can_cure(drug_card, disorder): ...
disorder = get_disorder_by_slug(slug)
```

**Convention:**
- Python: `snake_case` cho biến/hàm, `PascalCase` cho class.
- JavaScript/React: `camelCase` cho biến/hàm, `PascalCase` cho component.
- Hằng số: `UPPER_SNAKE_CASE` ở cả hai.
- File Python: `snake_case.py`. File React component: `PascalCase.jsx`. File hook/util: `camelCase.js`.

---

## 5. Cấu trúc file

- Không có summary/description ở đầu file.
- Import sắp xếp theo nhóm: stdlib → third-party → local. Mỗi nhóm cách nhau 1 dòng trống.
- Nếu file bắt đầu dài (> ~200 dòng), xem xét tách module.

---

## 6. Quy tắc cụ thể

**Python:**
- Dùng type hint cho function signature của các hàm public.
- Dùng `dataclass` cho data container, không dùng dict thuần khi có schema cố định.
- Không catch exception quá rộng (`except Exception`) trừ ở top-level error handler.

**React/JavaScript:**
- Mỗi component trong file riêng.
- Business logic vào hook hoặc store — không trong component.
- Không truyền quá 3–4 props xuống nhiều tầng — dùng Zustand store.

**Chung:**
- Không commit code có `console.log` debug còn sót.
- Magic number → đặt thành hằng:
  ```python
  # Sai
  await asyncio.sleep(10)
  
  # Đúng
  SIDE_EFFECT_WINDOW_SECONDS = 10
  await asyncio.sleep(SIDE_EFFECT_WINDOW_SECONDS)
  ```

---

## 7. Các hằng số quan trọng (centralize trong `config/settings.py`)

```python
# Gameplay
INITIAL_DISORDERS = 4
INITIAL_HAND_SIZE = 4
DEFAULT_MAX_HAND_SIZE = 7
DEFAULT_TURN_TIMEOUT_SECONDS = 60
SIDE_EFFECT_WINDOW_SECONDS = 10
DISCARD_TIMEOUT_SECONDS = 10
CHOOSE_DISORDER_TIMEOUT_SECONDS = 10

# Connection
AFK_TIMEOUT_SECONDS = 30
GAME_PAUSE_TIMEOUT_SECONDS = 300   # 5 phút
GUEST_SESSION_EXPIRY_DAYS = 14

# Server
MAX_PLAYERS_PER_ROOM = 8
MAX_ROOMS = 10                     # bỏ qua khi DEV_MODE=true
SNAPSHOT_RETENTION = 5
LOAD_CHECK_RAM_THRESHOLD = 80      # %
LOAD_CHECK_CPU_THRESHOLD = 85      # %
```
