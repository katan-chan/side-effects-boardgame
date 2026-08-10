# 01 - Thẻ bài (Cards) — PsycheWard

Có 4 loại thẻ trong PsycheWard. Tên loại thẻ giữ nguyên tiếng Anh trong code, hiển thị tiếng Việt trong game.

> **Lưu ý cho dev/designer:** Toàn bộ nội dung thẻ (tên, mô tả, side effects) được định nghĩa tập trung tại `backend/cards/`. Artwork placeholder dùng màu nền theo loại thẻ — designer thêm artwork sau bằng cách thay file ảnh theo slug thẻ.

---

## Loại thẻ 1 — Disorder (Thẻ Bệnh) 🧠

**Màu nền placeholder:** Tím tối `#3b0764`
**Hiển thị trong game:** "Rối loạn"

Mỗi người bắt đầu với 4 thẻ Disorder úp ngửa trước mặt (psyche). Mỗi thẻ có:
- **Tên bệnh**
- **Hình phạt** — hiệu ứng tiêu cực xảy ra khi bị kích hoạt bởi thẻ Episode
- **Điều kiện trị** — loại Drug card nào có thể chữa thẻ này

### Danh sách Disorder

| Slug | Tên hiển thị | Hình phạt khi bị Episode kích hoạt | Điều kiện trị |
|---|---|---|---|
| `paranoia` | Hoang Tưởng | Bỏ qua lượt hành động tiếp theo | Drug loại `antipsychotic` |
| `anxiety` | Lo Âu | Phải bỏ 1 thẻ bài trên tay ngẫu nhiên | Drug loại `anxiolytic` |
| `depression` | Trầm Cảm | Không được rút thêm thẻ lượt này | Drug loại `antidepressant` |
| `insomnia` | Mất Ngủ | Bỏ lượt hành động, chỉ được rút thẻ | Drug loại `sedative` |
| `mania` | Hưng Cảm | Phải dùng thẻ Episode ngẫu nhiên từ tay (nếu có) | Drug loại `mood_stabilizer` |
| `ocd` | Ám Ảnh Cưỡng Chế | Phải đánh thẻ vào đúng người đã đánh thẻ vào mình lượt trước | Drug loại `antidepressant` |
| `ptsd` | Rối Loạn Căng Thẳng | Mất 1 thẻ Disorder đã trị (ngẫu nhiên) — bệnh cũ tái phát | Drug loại `antidepressant` |
| `adhd` | Tăng Động Giảm Chú Ý | Phải rút 2 thẻ và dùng ngay thẻ vừa rút nếu là Episode | Drug loại `stimulant` |
| `schizophrenia` | Tâm Thần Phân Liệt | Người chơi bên trái gán thêm 1 Disorder mới từ deck vào psyche | Drug loại `antipsychotic` |
| `bipolar` | Lưỡng Cực | Xáo trộn lại tay bài và rút lại cùng số lượng | Drug loại `mood_stabilizer` |
| `hypochondria` | Lo Sợ Bệnh Tật | Tự thêm 1 Disorder ngẫu nhiên vào psyche của mình | Drug loại `anxiolytic` |
| `narcissism` | Tự Yêu Bệnh Hoạn | Không được nhắm vào người có ít Disorder nhất | Drug loại `therapy` |
| `phobia` | Ám Ảnh Sợ Hãi | Không được nhắm vào người có nhiều Disorder nhất | Drug loại `anxiolytic` |
| `dissociation` | Giải Thể Nhân Cách | Bỏ ngẫu nhiên 1 thẻ Disorder đang có trong tay (nếu có) | Drug loại `antipsychotic` |
| `addiction` | Nghiện Ngập | Phải dùng thẻ Drug tiếp theo thu được ngay lập tức, dù có muốn hay không | Drug loại `sedative` |
| `burnout` | Kiệt Sức | Không được dùng thẻ Therapy lượt này | Drug loại `stimulant` |

---

## Loại thẻ 2 — Drug (Thẻ Thuốc) 💊

**Màu nền placeholder:** Xanh lá tối `#14532d`
**Hiển thị trong game:** "Thuốc"

Drug card trị Disorder nhưng có **side effects** — danh sách các loại bệnh người khác có thể "ném" vào bạn sau khi bạn dùng thuốc. Nghĩa là: sau khi bạn dùng Drug card, bạn **hở** (vulnerable) với các Disorder loại đó — người khác có thể thêm Disorder đó vào psyche của bạn từ deck.

Mỗi Drug card có:
- **Tên thuốc**
- **Loại** (`drug_type`) — quyết định nó trị Disorder nào
- **Side Effects** — danh sách loại Disorder có thể bị thêm vào
- **Cường độ** (`potency: 1|2|3`) — 1 = trị 1 Disorder, 2 = trị 2 Disorder cùng loại, 3 = trị bất kỳ 1 Disorder

### Danh sách Drug

| Slug | Tên hiển thị | Loại (`drug_type`) | Potency | Side Effects (loại Disorder dễ bị thêm) |
|---|---|---|---|---|
| `prozac` | Prozac | `antidepressant` | 1 | `insomnia`, `mania` |
| `zoloft` | Zoloft | `antidepressant` | 1 | `anxiety`, `insomnia` |
| `lexapro` | Lexapro | `antidepressant` | 2 | `insomnia`, `adhd` |
| `xanax` | Xanax | `anxiolytic` | 1 | `addiction`, `depression` |
| `valium` | Valium | `anxiolytic` | 1 | `addiction`, `insomnia` |
| `ativan` | Ativan | `anxiolytic` | 2 | `depression`, `addiction` |
| `haldol` | Haldol | `antipsychotic` | 1 | `depression`, `insomnia` |
| `risperdal` | Risperdal | `antipsychotic` | 1 | `mania`, `adhd` |
| `abilify` | Abilify | `antipsychotic` | 2 | `anxiety`, `insomnia` |
| `lithium` | Lithium | `mood_stabilizer` | 1 | `adhd`, `burnout` |
| `depakote` | Depakote | `mood_stabilizer` | 2 | `insomnia`, `burnout` |
| `ambien` | Ambien | `sedative` | 1 | `addiction`, `dissociation` |
| `lunesta` | Lunesta | `sedative` | 1 | `addiction`, `depression` |
| `adderall` | Adderall | `stimulant` | 1 | `anxiety`, `insomnia` |
| `ritalin` | Ritalin | `stimulant` | 1 | `anxiety`, `mania` |
| `wildcard_pill` | The Mystery Pill | *(bất kỳ)* | 3 | `paranoia`, `schizophrenia` |

> **Ghi chú gameplay:** "Hở" với side effect nghĩa là trong lượt của mình, người chơi khác có thể dùng 1 hành động để thêm Disorder của loại đó vào psyche của bạn (kéo từ discard pile hoặc deck). Trạng thái "hở" kéo dài đến đầu lượt tiếp theo của bạn.

---

## Loại thẻ 3 — Therapy (Thẻ Trị Liệu) 🛋️

**Màu nền placeholder:** Vàng ấm `#713f12`
**Hiển thị trong game:** "Trị Liệu"

Therapy card không trị Disorder theo loại cụ thể — thay vào đó chúng có hiệu ứng đặc biệt: có thể hỗ trợ bản thân, bảo vệ khỏi tác dụng phụ, hoặc làm xáo trộn bàn cờ.

| Slug | Tên hiển thị | Hiệu ứng |
|---|---|---|
| `cbt` | Liệu Pháp Nhận Thức | Trị 1 Disorder bất kỳ trong psyche của bạn |
| `group_therapy` | Liệu Pháp Nhóm | Mỗi người chơi trị 1 Disorder bất kỳ (kể cả bạn) |
| `meditation` | Thiền Định | Bạn miễn nhiễm với tác dụng phụ (side effects) trong 1 lượt |
| `journaling` | Viết Nhật Ký | Rút 3 thẻ thêm |
| `self_care` | Tự Chăm Sóc | Bỏ toàn bộ trạng thái "hở" hiện tại |
| `exposure_therapy` | Liệu Pháp Tiếp Xúc | Nhìn trộm tay bài của 1 người chơi khác |
| `hypnotherapy` | Thôi Miên | Đổi 1 Disorder ngẫu nhiên từ psyche của bạn sang psyche của người khác |
| `placebo` | Giả Dược | Làm người chơi bên cạnh nghĩ bạn đã trị thêm 1 bệnh (thực ra không) — họ có thể "phản ứng" bằng side effect |

---

## Loại thẻ 4 — Episode (Thẻ Sự Kiện) ⚡

**Màu nền placeholder:** Đỏ tối `#7f1d1d`
**Hiển thị trong game:** "Cơn Khủng Hoảng"

Episode card kích hoạt hình phạt của Disorder trên psyche mục tiêu. Mỗi Episode card chỉ kích hoạt **1 Disorder** của mục tiêu (người chơi chọn Disorder nào bị kích hoạt nếu mục tiêu có nhiều hơn 1).

| Slug | Tên hiển thị | Hiệu ứng bổ sung ngoài kích hoạt Disorder |
|---|---|---|
| `panic_attack` | Cơn Hoảng Loạn | Kích hoạt Disorder. Nếu mục tiêu không có Disorder → không hiệu lực |
| `breakdown` | Sụp Đổ Tinh Thần | Kích hoạt Disorder. Mục tiêu bỏ thêm 1 lượt không rút thẻ |
| `relapse` | Tái Phát | Kích hoạt Disorder. Thêm 1 Disorder ngẫu nhiên vào psyche mục tiêu |
| `trigger` | Cò Súng Tâm Lý | Kích hoạt Disorder. Bạn cũng bị kích hoạt 1 Disorder của mình (nếu có) |
| `intervention` | Can Thiệp | Kích hoạt Disorder của mục tiêu VÀ của người chơi bên cạnh mục tiêu |
| `bad_day` | Ngày Tệ | Kích hoạt Disorder. Mục tiêu không được dùng Therapy lượt sau |
| `gaslighting` | Thao Túng Tâm Lý | Chuyển 1 Disorder đã trị của mục tiêu (ngẫu nhiên) sang trạng thái chưa trị |
| `spiral` | Xoáy Tâm Lý | Kích hoạt tất cả Disorder của mục tiêu (hiếm — chỉ 2 lá trong deck) |

---

## Cấu trúc deck

Deck tiêu chuẩn cho 4 người chơi:

| Loại thẻ | Số lá |
|---|---|
| Disorder | 32 (2 lá mỗi loại) |
| Drug | 40 (2–3 lá mỗi loại, Mystery Pill chỉ 1 lá) |
| Therapy | 20 (2–3 lá mỗi loại) |
| Episode | 24 (3 lá mỗi loại, Spiral chỉ 2 lá) |
| **Tổng** | **~116 lá** |

Khi số người chơi tăng, deck được scale: thêm 1 bộ Disorder mỗi người + tỉ lệ Drug/Therapy/Episode giữ nguyên.

---

## Card metadata (định nghĩa trong backend)

```python
@dataclass
class CardMeta:
    slug: str                    # VD: "prozac", "paranoia"
    display_name_vi: str         # Tên tiếng Việt hiển thị trong game
    card_type: CardType          # DISORDER | DRUG | THERAPY | EPISODE
    description_vi: str          # Mô tả ngắn hiển thị trên thẻ
    # Drug only:
    drug_type: str | None        # "antidepressant" | "anxiolytic" | ...
    potency: int | None          # 1 | 2 | 3
    side_effects: list[str]      # Danh sách slug loại Disorder có thể bị thêm
    # Disorder only:
    punishment_vi: str | None    # Mô tả hình phạt khi bị Episode kích hoạt
    cure_drug_type: str | None   # Loại Drug có thể trị
    # Episode only:
    bonus_effect_vi: str | None  # Hiệu ứng bổ sung ngoài kích hoạt Disorder
    # Artwork:
    art_file: str                # VD: "prozac.png" — designer thêm sau
```

Tất cả card definitions nằm trong `backend/cards/*.py`. Frontend đọc từ `GET /api/cards` và cache vào `config/cardData.js` cho render. Không hardcode card data trong FE component.
