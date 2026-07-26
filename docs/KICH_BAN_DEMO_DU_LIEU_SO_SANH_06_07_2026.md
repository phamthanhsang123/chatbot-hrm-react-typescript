# Kịch bản demo dữ liệu so sánh tháng 06 và 07/2026

## 1. Mục đích

Bộ dữ liệu này dùng để trình bày luồng TV3 - Agentic AI trên dữ liệu được lưu thật
trong MySQL, không phải mock data trong Frontend.

Dữ liệu có nhãn `[CDIO4]` để truy vết và phân biệt với dữ liệu do người dùng nhập.
Seeder chạy nhiều lần không tạo bản ghi trùng.

## 2. Tài khoản có dữ liệu

| ID | Nhân sự | Vai trò | Phòng ban | Mục đích tình huống |
|---:|---|---|---|---|
| 5 | Lê Văn Kiến Quân | Manager | HR | Hiệu suất tốt nhưng tháng 07 còn task đang mở |
| 6 | Phạm Thanh Sang | Employee | IT | Chất lượng task cải thiện, chấm công còn rủi ro |
| 7 | Ngô Vũ Chính | Employee | IT | Hiệu suất giảm mạnh, cần AI cảnh báo |
| 8 | Dương Thị Minh Châu | Employee | HR | Cải thiện đồng đều và là ứng viên ghi nhận |

Tài khoản Admin không được chấm năng lực vì đây là tài khoản vận hành hệ thống. Admin
được dùng làm người duyệt hoặc người chạy Agentic AI.

## 3. Dữ liệu đã tạo trong MySQL

- 152 bản ghi chấm công và 152 ca làm.
- 8 đơn bổ sung/điều chỉnh chấm công.
- 8 đơn nghỉ phép.
- 8 bảng lương của hai kỳ.
- 24 task.
- 72 lần cập nhật tiến độ.
- 24 review task của quản lý.
- 8 kết quả đánh giá năng lực đã lưu.

## 4. Kết quả đánh giá thực tế

| Nhân sự | 06/2026 | 07/2026 | Nhận xét so sánh |
|---|---:|---:|---|
| Lê Văn Kiến Quân | 95,48 - Xuất sắc | 88,38 - Tốt | Chất lượng tốt nhưng tháng 07 còn task đang mở |
| Phạm Thanh Sang | 77,45 - Trung bình | 84,95 - Tốt | Task cải thiện, cần tiếp tục xử lý dữ liệu chấm công thiếu |
| Ngô Vũ Chính | 98,62 - Xuất sắc | 59,50 - Cần cải thiện | Có task quá hạn/cần sửa và kỷ luật thời gian giảm |
| Dương Thị Minh Châu | 93,62 - Xuất sắc | 97,88 - Xuất sắc | Tiến bộ ổn định, phù hợp đề xuất ghi nhận |

Các kết quả đang ở trạng thái `PENDING_APPROVAL`. Đây là đúng nghiệp vụ: AI chỉ đề
xuất, Manager/Admin phải xem bằng chứng rồi mới duyệt hoặc từ chối.

## 5. Câu hỏi demo trên AI Assistant

Chọn đúng tháng trên giao diện trước khi hỏi.

### Chấm công

1. `Phạm Thanh Sang đi trễ bao nhiêu ngày?`
2. `Tổng giờ làm và nghỉ phép của Phạm Thanh Sang`
3. `Ngô Vũ Chính đi trễ bao nhiêu ngày?`

### Task

1. `Ngô Vũ Chính có bao nhiêu task?`
2. `Tổng quan task của Phạm Thanh Sang`
3. `Sang và Châu có bao nhiêu task trong tháng này?`

### Lương

1. `Sang và Châu lương tháng này mấy?`
2. `Tổng lương trước giờ của Phạm Thanh Sang`

Ví dụ đã kiểm tra:

- Tháng 06, Sang đi trễ 4 ngày.
- Tháng 07, Sang đi trễ 5 ngày do có thêm dữ liệu thực tế đã nhập trước đó.
- Tháng 07, Sang và Châu có tổng lương ghi nhận 162.000.000 đồng.
- Tháng 07, Vũ Chính có 6 task, gồm task đang làm, cần sửa và quá hạn.

## 6. Luồng demo phần Phân tích năng lực

1. Đăng nhập Admin hoặc Manager.
2. Mở `Đánh giá năng lực`.
3. Chọn tháng 06/2026 và xem điểm, xếp loại, bằng chứng.
4. Chuyển sang tháng 07/2026 để so sánh.
5. Mở Vũ Chính để trình bày trường hợp AI phát hiện suy giảm.
6. Mở Minh Châu để trình bày trường hợp AI đề xuất ghi nhận.
7. Manager đọc nguồn dữ liệu, nhận xét và khuyến nghị.
8. Manager quyết định duyệt hoặc từ chối; AI không tự ra quyết định nhân sự cuối cùng.

## 7. Vì sao đây là dữ liệu phù hợp để trình bày

- Dữ liệu nằm trong MySQL và được đọc qua Tool Layer.
- Điểm không nhập tay ở Frontend mà được tính từ task, review, chấm công và nghỉ phép.
- Hai tháng có xu hướng khác nhau nên thể hiện được khả năng phân tích theo kỳ.
- Có cả trường hợp tốt, cải thiện, suy giảm và thiếu dữ liệu.
- Reflection Agent kiểm tra dữ liệu trước khi tạo báo cáo.
- Quyết định cuối cùng vẫn thuộc về người quản lý.

## 8. Chạy lại seeder

Từ thư mục `backend/Admin`:

```powershell
dotnet run -- --seed-cdio4-comparison
```

Seeder tự lấy tháng hiện tại và tháng trước. Với thời điểm tạo tài liệu này, hai kỳ là
06/2026 và 07/2026.

