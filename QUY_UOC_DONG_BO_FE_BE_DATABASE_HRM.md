# Quy ước đồng bộ FE - BE - Database cho dự án HRM

## 1. Mục đích

File này dùng để tránh tình trạng mỗi thành viên làm một kiểu:

- FE có field nhưng BE không có.
- BE có API nhưng FE gọi sai URL hoặc sai request body.
- Database có cột nhưng DTO không trả về.
- FE có role `Manager` nhưng BE chưa có API cho Manager.
- Người này dùng `cccd`, người kia không dùng.
- Người này dùng `departmentId`, người kia dùng `department_name` trực tiếp.

Nguyên tắc chung:

```text
Muốn thêm/sửa chức năng -> cập nhật contract trước -> BE/DB làm theo -> FE gọi theo -> test lại luồng.
```

---

## 2. Tài liệu liên quan

| File | Vai trò |
| --- | --- |
| `PHAN_CONG_CONG_VIEC_NHOM_HRM.md` | Phân công thành viên và quy trình làm việc |
| `TAI_LIEU_LOGIC_NGHIEP_VU_HRM.md` | Logic nghiệp vụ tổng thể |
| `TAI_LIEU_MODULE_DANH_GIA_NANG_LUC.md` | Logic module đánh giá năng lực |
| `TAI_LIEU_MANAGER_TASK_AGENTIC_AI.md` | Luồng Manager giao task và Agentic AI |
| `QUY_UOC_DONG_BO_FE_BE_DATABASE_HRM.md` | Contract kỹ thuật FE - BE - Database |
| `TONG_HOP_DONG_BO_CHUC_NANG_HRM.md` | Tổng hợp FE, BE, Database đang có và còn thiếu theo từng module |

Khi code không rõ phải theo file nào, ưu tiên:

```text
Logic nghiệp vụ -> Contract kỹ thuật -> Code hiện tại
```

---

## 3. Quy tắc bắt buộc khi làm nhóm

### 3.1. Không tự ý thêm field riêng

Ví dụ sai:

```text
TV1 thêm ô CCCD ở FE nhưng TV2 không thêm cột cccd trong database.
TV2 trả về role = "MANAGER" nhưng FE chỉ xử lý "admin" và "employee".
TV4 làm màn hình task của Employee nhưng TV2 chưa có API task.
```

Nếu cần thêm field, phải cập nhật đủ 4 nơi:

```text
Database -> Backend Model/DTO/API -> Frontend service/type -> Frontend UI
```

### 3.2. Backend là nguồn dữ liệu thật

FE không được giữ dữ liệu fake lâu dài nếu chức năng đã có API.

Chỉ được dùng fake data khi:

- API chưa làm xong.
- Có ghi rõ trong code hoặc tài liệu là dữ liệu tạm.
- Khi API xong phải đổi sang gọi API thật.

### 3.3. Không push mật khẩu database

Không push các file chứa mật khẩu thật:

```text
backend/Admin/appsettings.json
backend/Admin/appsettings.Development.json
.env
.env.local
```

Nên có file mẫu:

```text
backend/Admin/appsettings.example.json
frontend/.env.example
```

---

## 4. Chuẩn naming giữa FE - BE - Database

### 4.1. Frontend và API response

Dùng camelCase:

```json
{
  "id": 1,
  "fullName": "Nguyễn Văn A",
  "departmentId": 1,
  "departmentName": "IT",
  "positionId": 2,
  "positionTitle": "Developer",
  "salaryBase": 15000000
}
```

### 4.2. Database

Dùng snake_case:

```sql
employee_id
full_name
department_id
position_id
salary_base
```

### 4.3. Backend mapping

Backend chịu trách nhiệm map:

```text
employee_id -> id
full_name -> fullName
department_id -> departmentId
position_id -> positionId
salary_base -> salaryBase
```

FE không được gọi trực tiếp theo tên cột database.

---

## 5. Chuẩn role trong hệ thống

Hệ thống thống nhất 3 role chính:

| Role trong DB/API | Hiển thị FE | Ý nghĩa |
| --- | --- | --- |
| `ADMIN` | Quản trị hệ thống | Account hệ thống, không tạo tùy tiện trong màn quản lý nhân viên |
| `MANAGER` | Quản lý | Quản lý nhân viên trong phòng ban |
| `EMPLOYEE` | Nhân viên | Nhân viên thông thường |

Quy tắc:

- Màn hình thêm/sửa nhân viên chỉ cho chọn `MANAGER` hoặc `EMPLOYEE`.
- `ADMIN` là account hệ thống, chỉ nên có 1 account chính.
- Nếu code cũ còn role `HR`, phải thống nhất lại trước khi dùng tiếp. Không tự thêm role mới.
- Backend lưu role dạng uppercase: `ADMIN`, `MANAGER`, `EMPLOYEE`.
- Frontend có thể hiển thị tiếng Việt, nhưng khi gửi API phải gửi role chuẩn.

---

## 6. Chuẩn module Nhân viên

### 6.1. Field chuẩn của Employee

| FE/API field | DB column | Kiểu dữ liệu | Bắt buộc | Ghi chú |
| --- | --- | --- | --- | --- |
| `id` | `employee_id` | number | Có | Khóa chính |
| `fullName` | `full_name` | string | Có | Họ tên nhân viên |
| `email` | `email` | string | Có | Không được trùng |
| `password` | `password` | string/null | Khi tạo account | Không trả về FE nếu không cần |
| `phone` | `phone` | string/null | Không | Số điện thoại |
| `cccd` | `cccd` | string/null | Có khi thêm mới | 12 chữ số, không được trùng |
| `role` | `role` | string | Có | `MANAGER` hoặc `EMPLOYEE` trong màn nhân viên |
| `status` | `status` | string | Có | `Đang làm việc` hoặc `Đã nghỉ việc` |
| `departmentId` | `department_id` | number/null | Có khi thêm mới | Liên kết phòng ban |
| `departmentName` | join `departments` | string/null | Không gửi khi tạo | Backend join trả về |
| `positionId` | `position_id` | number/null | Có khi thêm mới | Liên kết chức vụ |
| `positionTitle` | join `positions` | string/null | Không gửi khi tạo | Backend join trả về |
| `salaryBase` | `salary_base` | number/null | Có khi thêm mới | Lương cơ bản |

### 6.2. Request tạo nhân viên

```http
POST /api/admin/employees
```

```json
{
  "fullName": "Nguyễn Văn A",
  "email": "nguyenvana@gmail.com",
  "phone": "0901234567",
  "cccd": "001203000002",
  "role": "EMPLOYEE",
  "status": "Đang làm việc",
  "departmentId": 1,
  "positionId": 2,
  "salaryBase": 15000000,
  "password": "123456"
}
```

### 6.3. Request cập nhật nhân viên

```http
PUT /api/admin/employees/{id}
```

```json
{
  "fullName": "Nguyễn Văn A",
  "email": "nguyenvana@gmail.com",
  "phone": "0901234567",
  "cccd": "001203000002",
  "role": "MANAGER",
  "status": "Đang làm việc",
  "departmentId": 1,
  "positionId": 3,
  "salaryBase": 18000000
}
```

Không gửi `password` khi cập nhật thông tin nhân viên, trừ khi làm chức năng đổi mật khẩu riêng.

### 6.4. Validation bắt buộc

FE kiểm tra trước, BE kiểm tra lại lần nữa.

| Field | Quy tắc |
| --- | --- |
| `fullName` | Không rỗng |
| `email` | Đúng định dạng email, không trùng |
| `cccd` | Đủ 12 chữ số, không trùng |
| `role` | Chỉ nhận `MANAGER` hoặc `EMPLOYEE` trong màn nhân viên |
| `departmentId` | Phải chọn phòng ban |
| `positionId` | Phải chọn chức vụ |
| `salaryBase` | Là số, lớn hơn hoặc bằng 0 |
| `status` | Khi tạo mới mặc định `Đang làm việc` |

### 6.5. API hiện có của Nhân viên

| Method | URL | Mục đích | FE dùng ở đâu |
| --- | --- | --- | --- |
| GET | `/api/admin/employees` | Lấy danh sách nhân viên | Quản lý nhân viên |
| GET | `/api/admin/employees/{id}` | Lấy chi tiết nhân viên | Form sửa/chi tiết |
| POST | `/api/admin/employees` | Tạo nhân viên | Form thêm nhân viên |
| PUT | `/api/admin/employees/{id}` | Cập nhật nhân viên | Form sửa nhân viên |
| DELETE | `/api/admin/employees/{id}` | Chuyển nhân viên sang nghỉ việc/xóa mềm | Nút xóa/nghỉ việc |
| GET | `/api/admin/employees/departments` | Lấy phòng ban | Select phòng ban |
| GET | `/api/admin/employees/positions` | Lấy chức vụ | Select chức vụ |

---

## 7. Chuẩn phòng ban và chức vụ

### 7.1. Department

| FE/API field | DB column | Ghi chú |
| --- | --- | --- |
| `id` | `department_id` | Khóa chính |
| `name` | `department_name` | Tên phòng ban |

### 7.2. Position hiện tại

| FE/API field | DB column | Ghi chú |
| --- | --- | --- |
| `id` | `position_id` | Khóa chính |
| `title` | `position_name` | Tên chức vụ |

### 7.3. Vấn đề cần thống nhất

Nghiệp vụ yêu cầu:

```text
Chọn phòng ban Marketing thì chỉ hiện chức vụ thuộc Marketing.
Chọn phòng ban IT thì chỉ hiện chức vụ thuộc IT.
```

Nhưng DB hiện tại mới có:

```text
positions(position_id, position_name)
```

Chưa có liên kết rõ với phòng ban.

Có 2 hướng xử lý:

| Hướng | Cách làm | Khuyến nghị |
| --- | --- | --- |
| Thêm `department_id` vào `positions` | Mỗi chức vụ thuộc một phòng ban | Dễ làm, phù hợp demo |
| Tạo bảng `department_positions` | Một chức vụ có thể thuộc nhiều phòng ban | Linh hoạt hơn nhưng phức tạp hơn |

Khuyến nghị cho đồ án:

```sql
ALTER TABLE positions ADD COLUMN department_id INT NULL;
```

Sau đó API `/api/admin/employees/positions` nên trả về:

```json
[
  {
    "id": 1,
    "title": "Developer",
    "departmentId": 1
  }
]
```

FE lọc chức vụ theo `departmentId`, không lọc bằng text tên phòng ban.

---

## 8. Chuẩn module Manager

Manager không giống Admin.

| Nội dung | Admin | Manager |
| --- | --- | --- |
| Xem tất cả nhân viên | Có | Không |
| Xem nhân viên trong phòng ban mình | Có | Có |
| Thêm/sửa/xóa nhân viên | Có | Không hoặc rất hạn chế |
| Giao task | Có thể | Có |
| Review task | Có thể | Có, trong phòng ban mình |
| Xem đánh giá năng lực toàn công ty | Có | Không |
| Xem đánh giá năng lực phòng ban mình | Có | Có |
| Quản lý lương | Có | Không hoặc chỉ xem đề xuất |
| Quản trị hệ thống | Có | Không |

### 8.1. FE cần có Manager route hoặc Manager mode

Hiện `frontend/app/page.tsx` mới có:

```ts
admin | employee
```

Cần bổ sung role:

```ts
admin | manager | employee
```

Manager UI nên có các màn:

| Màn hình | Mục đích |
| --- | --- |
| Dashboard phòng ban | Tổng quan nhân viên, task, hiệu suất |
| Nhân viên phòng ban | Xem danh sách nhân viên thuộc phòng ban mình |
| Giao task | Tạo task cho nhân viên |
| Theo dõi task | Xem tiến độ task |
| Review task | Duyệt, chấm điểm, yêu cầu làm lại |
| Đánh giá năng lực | Xem AI phân tích và phê duyệt kết quả |

### 8.2. BE cần có API Manager riêng

Không nên để Manager dùng API Admin toàn quyền.

API đề xuất:

| Method | URL | Mục đích |
| --- | --- | --- |
| GET | `/api/manager/employees` | Lấy nhân viên trong phòng ban của Manager |
| GET | `/api/manager/tasks` | Lấy task của phòng ban |
| POST | `/api/manager/tasks` | Manager giao task |
| GET | `/api/manager/tasks/{id}` | Xem chi tiết task |
| PUT | `/api/manager/tasks/{id}` | Sửa task khi chưa hoàn thành |
| POST | `/api/manager/tasks/{id}/review` | Review task |
| GET | `/api/manager/competency` | Xem đánh giá năng lực phòng ban |
| POST | `/api/manager/competency/{id}/approve` | Duyệt kết quả đánh giá |

Quy tắc BE:

- Manager chỉ được thao tác với nhân viên cùng `departmentId`.
- Manager không được giao task cho nhân viên ngoài phòng ban.
- Manager không được xem lương toàn công ty.
- Manager không được sửa role của nhân viên.

---

## 9. Chuẩn module Task cho Agentic AI

Module task là nền để AI đánh giá năng lực.

### 9.1. Task status

| Status | Ý nghĩa |
| --- | --- |
| `NEW` | Task mới được giao |
| `IN_PROGRESS` | Nhân viên đang làm |
| `SUBMITTED` | Nhân viên đã gửi hoàn thành |
| `APPROVED` | Manager duyệt hoàn thành |
| `REJECTED` | Manager từ chối |
| `REVISION_REQUIRED` | Manager yêu cầu sửa lại |
| `OVERDUE` | Quá hạn |

### 9.2. Task priority

| Priority | Ý nghĩa |
| --- | --- |
| `LOW` | Thấp |
| `MEDIUM` | Trung bình |
| `HIGH` | Cao |
| `CRITICAL` | Rất quan trọng |

### 9.3. Bảng `tasks` đề xuất

| Column | Kiểu | Ghi chú |
| --- | --- | --- |
| `task_id` | int | Khóa chính |
| `employee_id` | int | Nhân viên nhận task |
| `manager_id` | int | Manager giao task |
| `department_id` | int | Phòng ban |
| `title` | varchar | Tên task |
| `description` | text | Mô tả |
| `deadline` | datetime | Hạn hoàn thành |
| `priority` | varchar | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `status` | varchar | Trạng thái task |
| `progress_percent` | int | 0-100 |
| `expected_score` | decimal | Điểm kỳ vọng |
| `created_at` | datetime | Ngày tạo |
| `updated_at` | datetime | Ngày cập nhật |

### 9.4. Bảng `task_progress_logs` đề xuất

| Column | Kiểu | Ghi chú |
| --- | --- | --- |
| `progress_id` | int | Khóa chính |
| `task_id` | int | Task |
| `employee_id` | int | Người cập nhật |
| `progress_percent` | int | Tiến độ |
| `note` | text | Ghi chú |
| `created_at` | datetime | Thời điểm cập nhật |

### 9.5. Bảng `task_reviews` đề xuất

| Column | Kiểu | Ghi chú |
| --- | --- | --- |
| `review_id` | int | Khóa chính |
| `task_id` | int | Task |
| `manager_id` | int | Người review |
| `quality_score` | decimal | Điểm chất lượng |
| `deadline_score` | decimal | Điểm deadline |
| `comment` | text | Nhận xét Manager |
| `decision` | varchar | `APPROVED`, `REJECTED`, `REVISION_REQUIRED` |
| `created_at` | datetime | Ngày review |

### 9.6. API Task đề xuất

Manager tạo task:

```http
POST /api/manager/tasks
```

```json
{
  "employeeId": 5,
  "title": "Hoàn thành báo cáo tháng",
  "description": "Tổng hợp số liệu phòng ban",
  "deadline": "2026-06-20T17:00:00",
  "priority": "HIGH",
  "expectedScore": 100
}
```

Employee cập nhật tiến độ:

```http
PUT /api/employee/tasks/{id}/progress
```

```json
{
  "progressPercent": 70,
  "note": "Đã hoàn thành phần tổng hợp dữ liệu"
}
```

Employee gửi hoàn thành:

```http
POST /api/employee/tasks/{id}/submit
```

Manager review:

```http
POST /api/manager/tasks/{id}/review
```

```json
{
  "qualityScore": 85,
  "deadlineScore": 90,
  "decision": "APPROVED",
  "comment": "Hoàn thành đúng yêu cầu, trình bày rõ ràng"
}
```

---

## 10. Chuẩn module Đánh giá năng lực

### 10.1. Dữ liệu đầu vào

AI không tự bịa dữ liệu. AI chỉ phân tích từ dữ liệu có trong hệ thống:

| Nguồn | Lấy từ đâu |
| --- | --- |
| Thông tin nhân viên | `employees` |
| Phòng ban/chức vụ | `departments`, `positions` |
| Chấm công | `attendance` |
| Nghỉ phép | `leave_requests` |
| Task | `tasks` |
| Tiến độ task | `task_progress_logs` |
| Review Manager | `task_reviews` |

### 10.2. Công thức chuẩn

```text
Tổng điểm =
    Chuyên cần * 20%
  + Hiệu suất task * 40%
  + Kỹ năng/chất lượng * 25%
  + Kỷ luật/trách nhiệm * 15%
```

### 10.3. Bảng `competency_reviews` đề xuất

| Column | Kiểu | Ghi chú |
| --- | --- | --- |
| `review_id` | int | Khóa chính |
| `employee_id` | int | Nhân viên được đánh giá |
| `manager_id` | int/null | Manager phụ trách |
| `month` | int | Tháng đánh giá |
| `year` | int | Năm đánh giá |
| `attendance_score` | decimal | Điểm chuyên cần |
| `task_performance_score` | decimal | Điểm hiệu suất task |
| `quality_skill_score` | decimal | Điểm chất lượng/kỹ năng |
| `discipline_responsibility_score` | decimal | Điểm kỷ luật/trách nhiệm |
| `total_score` | decimal | Tổng điểm |
| `rank` | varchar | Xếp loại |
| `ai_summary` | text | AI nhận xét |
| `ai_recommendation` | text | AI đề xuất |
| `status` | varchar | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED` |
| `created_at` | datetime | Ngày tạo |

### 10.4. API Competency đề xuất

| Method | URL | Mục đích |
| --- | --- | --- |
| GET | `/api/admin/competency` | Admin xem toàn bộ đánh giá |
| GET | `/api/admin/competency/dashboard` | Dashboard năng lực toàn công ty |
| GET | `/api/admin/competency/{employeeId}/analyze` | AI phân tích nhân viên |
| GET | `/api/manager/competency` | Manager xem đánh giá phòng ban |
| POST | `/api/manager/agentic-ai/analyze` | Chạy Agentic AI và tạo đánh giá hợp lệ cho nhân viên |
| POST | `/api/manager/competency/{reviewId}/approve` | Manager duyệt đánh giá |

---

## 11. Chuẩn các module HRM còn lại

### 11.1. Chấm công

API hiện có:

| Method | URL | Mục đích |
| --- | --- | --- |
| POST | `/api/admin/attendance/checkin/{empId}` | Check-in |
| POST | `/api/admin/attendance/checkout/{empId}` | Check-out |
| GET | `/api/admin/attendance` | Danh sách chấm công |
| GET | `/api/admin/attendance/summary` | Tổng quan chấm công |
| GET | `/api/admin/attendance/report` | Báo cáo chấm công |

Chuẩn status nên dùng:

| Status | Ý nghĩa |
| --- | --- |
| `ONTIME` | Đúng giờ |
| `LATE` | Đi trễ |
| `EARLY_LEAVE` | Về sớm |
| `ABSENT` | Vắng |
| `APPROVED_LEAVE` | Nghỉ phép đã duyệt |

### 11.2. Nghỉ phép

API hiện có:

| Method | URL | Mục đích |
| --- | --- | --- |
| GET | `/api/admin/leave-requests` | Danh sách đơn nghỉ |
| POST | `/api/admin/leave-requests` | Tạo đơn nghỉ |
| POST | `/api/admin/leave-requests/{id}/approve` | Duyệt đơn |
| POST | `/api/admin/leave-requests/{id}/reject` | Từ chối đơn |
| GET | `/api/admin/leave-requests/dashboard` | Dashboard nghỉ phép |

Chuẩn status:

| Status | Ý nghĩa |
| --- | --- |
| `Chờ duyệt` | Đơn mới |
| `Đã duyệt` | Đơn hợp lệ |
| `Từ chối` | Đơn bị từ chối |

### 11.3. Lương

API hiện có:

| Method | URL | Mục đích |
| --- | --- | --- |
| GET | `/api/admin/salary/dashboard` | Dashboard lương |
| GET | `/api/admin/salary` | Danh sách bảng lương |
| POST | `/api/admin/salary/calculate` | Tính lương |
| POST | `/api/admin/salary/{id}/approve` | Duyệt lương |
| POST | `/api/admin/salary/{id}/pay` | Thanh toán lương |

Chuẩn status:

| Status | Ý nghĩa |
| --- | --- |
| `Chưa tính` | Chưa tạo bảng lương |
| `Chờ duyệt` | Đã tính, chờ duyệt |
| `Chờ thanh toán` | Đã duyệt |
| `Đã thanh toán` | Hoàn tất |

Lưu ý:

- Lương không dùng trực tiếp để tính năng lực.
- Kết quả đánh giá năng lực có thể dùng để đề xuất thưởng.

---

## 12. Chuẩn Frontend service/type

Mỗi module FE nên có file service riêng:

```text
frontend/services/employees.ts
frontend/services/tasks.ts
frontend/services/competency.ts
frontend/services/attendance.ts
frontend/services/leave.ts
frontend/services/salary.ts
```

Không nên khai báo type trùng lặp ở nhiều component.

Ví dụ đúng:

```ts
// frontend/services/employees.ts
export interface EmployeeApiItem {
  id: number;
  email: string;
  role: string;
  fullName: string;
  phone?: string | null;
  cccd?: string | null;
  status: string;
  departmentId?: number | null;
  departmentName?: string | null;
  positionId?: number | null;
  positionTitle?: string | null;
  salaryBase?: number | null;
}
```

Component chỉ import type từ service:

```ts
import { EmployeeApiItem, fetchEmployees } from '@/services/employees';
```

---

## 13. Chuẩn Backend DTO

Backend không nên trả trực tiếp Entity nếu dữ liệu có password hoặc field nội bộ.

Nên dùng DTO:

```csharp
public class EmployeeDto
{
    public int Id { get; set; }
    public string Email { get; set; } = "";
    public string Role { get; set; } = "EMPLOYEE";
    public string FullName { get; set; } = "";
    public string? Phone { get; set; }
    public string? Cccd { get; set; }
    public string Status { get; set; } = "Đang làm việc";
    public int? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public int? PositionId { get; set; }
    public string? PositionTitle { get; set; }
    public decimal? SalaryBase { get; set; }
}
```

Không trả `password` về FE.

---

## 14. Khi thêm một chức năng mới phải làm đủ gì?

Ví dụ thêm chức năng Manager giao task.

### Bước 1: Cập nhật contract

Ghi rõ:

- Bảng DB mới.
- API mới.
- Request body.
- Response body.
- Role được gọi.
- FE màn hình nào dùng.

### Bước 2: TV2 làm Backend/Database

- Tạo bảng `tasks`.
- Tạo Model/DTO.
- Tạo Controller.
- Tạo Service.
- Test API bằng Swagger/Postman.

### Bước 3: TV1 hoặc TV4 làm Frontend

- Tạo service `frontend/services/tasks.ts`.
- Tạo type đúng theo API.
- Tạo UI.
- Gọi API thật.
- Xử lý loading/error/success.

### Bước 4: TV3 nối logic AI

- Lấy task đã review.
- Tính điểm task.
- Kết hợp chấm công/nghỉ phép.
- Sinh nhận xét và đề xuất.

### Bước 5: Test tích hợp

Test theo luồng:

```text
Manager giao task
-> Employee thấy task mới
-> Employee cập nhật tiến độ
-> Employee submit
-> Manager review
-> AI tạo đánh giá
-> Manager duyệt kết quả
```

---

## 15. Checklist trước khi tạo Pull Request

Mỗi PR phải tự kiểm tra:

```text
[ ] Có sửa/tạo API thì đã cập nhật contract.
[ ] Có sửa DB thì đã có file SQL/migration.
[ ] Có thêm field FE thì BE DTO đã có field đó.
[ ] Có thêm field BE thì FE service/type đã cập nhật.
[ ] Có thêm role/status thì cả FE và BE đều xử lý.
[ ] Không push password/token/API key.
[ ] Không còn dữ liệu fake nếu API thật đã có.
[ ] Chạy lại project không lỗi chính.
[ ] Ghi rõ file đã sửa trong mô tả PR.
```

---

## 16. Bảng trạng thái module hiện tại

| Module | FE | BE/API | Database | Ghi chú |
| --- | --- | --- | --- | --- |
| Login/Auth | Có | Có | Có | Cần chuẩn lại role `manager` |
| Nhân viên | Có | Có | Có | Đã có `cccd`, `role`, `salaryBase` |
| Phòng ban | Có select | Có API list | Có | Cần API quản lý CRUD nếu muốn đầy đủ |
| Chức vụ | Có select | Có API list | Có | Cần thêm liên kết phòng ban |
| Chấm công | Có UI | Có API | Có | Một số UI còn dùng dữ liệu mẫu |
| Nghỉ phép | Có UI | Có API | Có | Cần phân rõ Admin/Employee API |
| Lương | Có UI | Có API | Có | Không dùng lương để tính năng lực |
| Đánh giá năng lực | Có UI | Có API demo | Chưa đủ bảng AI thật | Cần nối task/review |
| Manager Task | Chưa đầy đủ | Chưa có API riêng | Chưa có bảng | Cần làm mới |
| Employee Task | Chưa đầy đủ | Chưa có API riêng | Chưa có bảng | Cần làm mới |

---

## 17. Kết luận

Muốn 4 người làm chung không loạn thì phải theo đúng quy trình:

```text
Chốt field -> Chốt API -> Chốt DB -> Code BE -> Code FE -> Test tích hợp -> PR -> Merge
```

Không ai được tự thêm field, role, status, API hoặc bảng database nếu chưa cập nhật file contract này.

File này là chuẩn để kiểm tra khi merge code của từng thành viên.
