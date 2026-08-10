# 02 - Chế độ chơi & Cấu hình — PsycheWard

## Chế độ chơi

### Standard (Tiêu chuẩn)

**Số người:** 2–8 người · **Khuyến nghị:** 4–6 người

Mỗi người bắt đầu với 4 Disorder cards (psyche), 4 thẻ trên tay (hand). Lần lượt theo chiều kim đồng hồ:
1. Rút 1 thẻ từ deck
2. Thực hiện 1 hành động (dùng Drug/Therapy trị bệnh, dùng Episode tấn công, hoặc pass)
3. Nếu sau hành động bạn đang "hở" (có side effects), người khác có thể phản ứng

Người đầu tiên trị hết 4 Disorder trong psyche thắng.

---

### Quick Play (Chơi Nhanh)

**Số người:** 2–6 · **Thời gian:** ~10 phút

Giống Standard nhưng:
- Mỗi người bắt đầu với **2 Disorder** thay vì 4
- Deck nhỏ hơn (bỏ bớt Episode cards)
- Không có trạng thái "hở" (side effects vẫn thêm bệnh nhưng người khác không được phản ứng ngay)

---

### Chaos Mode

**Số người:** 3–8

Giống Standard nhưng:
- Mỗi lượt rút **2 thẻ** thay vì 1
- Episode cards có thể dùng vào bất kỳ lúc nào trong lượt của người khác (interrupt)
- Disorder mới có thể được thêm vào psyche không giới hạn (không có trần 4 bệnh)

---

## Cài đặt Host có thể chỉnh (tại màn hình chờ)

Host chỉnh trực tiếp ngay màn hình phòng chờ, **không cần vào màn Settings riêng**. Các người chơi khác thấy cập nhật realtime.

| Cài đặt | Mặc định | Khoảng cho phép | Ghi chú |
|---|---|---|---|
| Chế độ chơi | Standard | Standard / Quick Play / Chaos | |
| Số Disorder ban đầu | 4 | 2–6 | Chỉ Standard/Chaos |
| Giới hạn thẻ trên tay | 7 | 4–10 | Số thẻ tối đa có thể giữ |
| Cho phép xem trước thẻ rút | Tắt | Bật/Tắt | Xem 1 thẻ tiếp theo của deck |
| Reveal Disorder khi bị trị | Bật | Bật/Tắt | Công khai hay giữ bí mật tên bệnh đã trị |
| Thời gian lượt tối đa (giây) | 60 | 30–120 | Hết giờ → tự động pass |
| Cho phép chat | Bật | Bật/Tắt | |

### Cảnh báo cấu hình

Hệ thống hiển thị warning realtime nếu:
- Số người < 2 (không đủ để chơi)
- Chaos Mode với 2 người (không khuyến nghị — sẽ quá nhanh)

---

## Màn hình chờ — Host controls

Host thấy thêm so với người chơi thường:
- Panel **Tùy chọn ván đấu** (như bảng trên) — người chơi khác chỉ xem, không chỉnh được
- Nút **Bắt đầu** — chỉ active khi đủ người đã Sẵn sàng và số người ≥ 2
- Nút **Kick** bên cạnh tên người chưa sẵn sàng

Tất cả người chơi (kể cả Host) thấy:
- Nút **Sẵn sàng** / **Hủy sẵn sàng** (toggle)
- Nút **Thoát phòng** (quay về trang chủ)
- Danh sách người trong phòng + trạng thái sẵn sàng

---

## Điều kiện thắng

| Chế độ | Điều kiện |
|---|---|
| Standard | Trị hết tất cả Disorder trong psyche (mặc định 4) |
| Quick Play | Trị hết Disorder trong psyche (mặc định 2) |
| Chaos Mode | Trị hết Disorder trong psyche (số lượng không giới hạn — thắng khi đạt 0) |

Kiểm tra điều kiện thắng **ngay sau mỗi lần trị bệnh thành công** — không chờ hết lượt.
