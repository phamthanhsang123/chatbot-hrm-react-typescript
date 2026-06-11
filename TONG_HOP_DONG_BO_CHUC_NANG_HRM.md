# Tổng hợp đồng bộ chức năng FE - BE - Database dự án HRM

## 1. Mục đích

File này là bản tổng hợp để 4 thành viên làm chung không bị lệch logic.

Vấn đề cần tránh:

- FE có field nhưng BE không có.
- BE có API nhưng FE không gọi.
- FE dùng dữ liệu mẫu trong khi BE đã có API.
- FE có Manager nhưng BE không có API Manager.
- FE có CCCD nhưng DB/BE không lưu.
- FE dùng status tiếng Anh, BE dùng status tiếng Việt.
- DB thêm bảng/cột nhưng không có Model/DTO/API.

Quy tắc bắt buộc:

```text
Một chức năng chỉ được xem là đúng khi đủ 3 lớp:
Frontend UI -> Backend API -> Database
```

Nếu thiếu một trong ba lớp thì phải ghi rõ là **chưa hoàn chỉnh**.

---

## 2. Trạng thái tổng quan hiện tại

| Module | FE hiện tại | BE hiện tại | DB hiện tại | Trạng thái |
| --- | --- | --- | --- | --- |
| Auth/Login | Có UI nhưng đang login giả | Có API login JWT | Dùng bảng `employees` | Chưa đồng bộ |
| Nhân viên | Đã gọi API thật | Có CRUD API | Có `employees` | Gần đúng |
| Phòng ban | Có select | Có API list | Có `departments` | Thiếu CRUD |
| Chức vụ | Có select | Có API list | Có `positions` | Thiếu liên kết phòng ban |
| Manager | Chưa có role UI riêng | Đã có API nền cho task/competency, còn thiếu Auth/JWT scope | Có thể dùng `employees.role` | Đang làm |
| Task | Chưa có UI chính thức | Đã có API Manager/Employee Task | Có SQL migration tạo bảng | Đang làm |
| Đánh giá năng lực | Có UI gọi API admin demo | Đã có API TV3 generate/approve theo task, API cũ vẫn rule-based | Có SQL migration tạo bảng review | Đang làm |
| Chấm công | Có UI nhưng dùng mẫu | Có API cơ bản | Có `attendance` nhưng mapping cần chuẩn lại | Chưa đồng bộ |
| Nghỉ phép | Có UI nhưng dùng mẫu | Có API cơ bản | Có `leave_requests`, `leave_types` | Chưa đồng bộ |
| Lương | Có UI nhưng dùng mẫu phức tạp | Có API payroll đơn giản | Có `payroll` | Chưa đồng bộ |
| Chatbot/AI Assistant | Đã gọi API | Có API in-memory | Chưa lưu DB qua EF | Demo tạm |
| Dashboard | Có UI mẫu | Chưa có API tổng hợp | Lấy từ nhiều bảng | Chưa đồng bộ |
| Reports | Có UI mẫu | Chưa có API report | Chưa có bảng/file report | Chưa đồng bộ |
| Analytics | Có UI mẫu | Chưa có API analytics | Lấy từ nhiều bảng | Chưa đồng bộ |
| Employee Portal | Có UI mẫu | Chưa có API employee riêng | Dùng bảng HRM chung | Chưa đồng bộ |

---

## 3. Chuẩn chung cho toàn bộ hệ thống

### 3.1. Chuẩn role

| Role chuẩn trong API/DB | Hiển thị trên FE | Ghi chú |
| --- | --- | --- |
| `ADMIN` | Quản trị hệ thống | Chỉ account hệ thống |
| `MANAGER` | Quản lý | Quản lý nhân viên trong phòng ban |
| `EMPLOYEE` | Nhân viên | Nhân viên thông thường |

Quy tắc:

- FE không được tự tạo role khác.
- BE phải normalize role về uppercase.
- Màn thêm/sửa nhân viên chỉ cho chọn `MANAGER` hoặc `EMPLOYEE`.
- `ADMIN` không tạo đại trà từ màn quản lý nhân viên.
- Nếu còn role `HR` trong code thì phải đổi về `ADMIN` hoặc xác định lại rõ vai trò.

### 3.2. Chuẩn naming

| Lớp | Kiểu đặt tên |
| --- | --- |
| Database | snake_case: `employee_id`, `full_name`, `salary_base` |
| Backend C# | PascalCase: `EmployeeId`, `FullName`, `SalaryBase` |
| API JSON/Frontend | camelCase: `employeeId`, `fullName`, `salaryBase` |

FE chỉ làm việc với JSON camelCase, không dùng trực tiếp tên cột DB.

### 3.3. Chuẩn xử lý dữ liệu

| Nội dung | Quy tắc |
| --- | --- |
| Tiền VND | FE format `15.000.000 đ`, BE/DB lưu number/decimal |
| CCCD | 12 chữ số, không trùng |
| Email | Đúng format, không trùng |
| Password | Không trả về FE |
| Status | Phải thống nhất giữa FE và BE |
| Dữ liệu fake | Chỉ dùng tạm khi API chưa có |
| Token | FE phải gửi `Authorization: Bearer {token}` khi API yêu cầu |

---

## 4. Module Auth/Login

### 4.1. Hiện tại

FE:

- File chính: `frontend/app/components/Login.tsx`.
- Đang login giả bằng:

```text
admin@company.com / admin123
employee@company.com / emp123
```

- Chỉ có role `admin` và `employee`.
- Chưa gọi API login thật.
- Chưa có role `manager`.
- Chưa lưu JWT token.

BE:

- API hiện có:

```http
POST /api/admin/auth/login
POST /api/admin/auth/forgot-password
```

- Login bằng email/password trong bảng `employees`.
- Trả về:

```json
{
  "success": true,
  "token": "...",
  "role": "EMPLOYEE"
}
```

DB:

- Dùng bảng `employees`.
- Các cột liên quan:

```text
employee_id
email
password
role
```

### 4.2. Thiếu cần bổ sung

| Bên | Cần bổ sung |
| --- | --- |
| FE | Tạo `frontend/services/auth.ts` |
| FE | Login gọi `POST /api/admin/auth/login` |
| FE | Lưu token vào `localStorage` hoặc state quản lý auth |
| FE | Thêm role `manager` vào `page.tsx` và `Login.tsx` |
| FE | Điều hướng theo role: `ADMIN`, `MANAGER`, `EMPLOYEE` |
| BE | Response login nên trả thêm `employeeId`, `fullName`, `departmentId` |
| BE | Bảo vệ API bằng `[Authorize]` theo role |
| DB | Đảm bảo password đã hash bằng BCrypt |

### 4.3. Contract chuẩn đề xuất

```http
POST /api/admin/auth/login
```

Request:

```json
{
  "username": "employee@gmail.com",
  "password": "123456"
}
```

Response:

```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "employeeId": 1,
    "fullName": "Nguyễn Văn A",
    "email": "employee@gmail.com",
    "role": "MANAGER",
    "departmentId": 1
  }
}
```

---

## 5. Module Nhân viên

### 5.1. Hiện tại

FE:

- File chính: `frontend/app/components/EmployeeTable.tsx`.
- Service: `frontend/services/employees.ts`.
- Đã gọi API thật:

```text
GET /api/admin/employees
GET /api/admin/employees/departments
GET /api/admin/employees/positions
POST /api/admin/employees
PUT /api/admin/employees/{id}
DELETE /api/admin/employees/{id}
```

- Có các field:

```text
fullName
email
phone
cccd
role
status
departmentId
positionId
salaryBase
password
```

BE:

- Controller: `EmployeeController`.
- Service: `EmployeeService`.
- Model: `Employee`.
- DTO update: `EmployeeUpdateDto`.
- Có check trùng email và CCCD.
- Có normalize role.
- Có status nhân viên.

DB:

- Bảng `employees` đang dùng:

```text
employee_id
email
password
role
full_name
phone
cccd
department_id
position_id
salary_base
status
```

### 5.2. Thiếu cần bổ sung

| Bên | Cần bổ sung |
| --- | --- |
| FE | Khi gọi API cần gửi JWT token nếu BE bật authorize |
| FE | Không dùng fallback chức vụ theo text lâu dài |
| FE | Role select chỉ giữ `MANAGER`, `EMPLOYEE` |
| FE | Khi xóa nên hiểu là chuyển `status = Đã nghỉ việc`, không xóa cứng |
| BE | Tách DTO tạo nhân viên, không nhận trực tiếp Entity `Employee` |
| BE | Không trả password về API |
| BE | Endpoint DELETE nên đổi thành nghỉ việc/xóa mềm |
| DB | Có unique index cho `email` |
| DB | Có unique index cho `cccd` |
| DB | Nên có `created_at`, `updated_at` nếu cần audit |

### 5.3. Contract Employee chuẩn

Response employee:

```json
{
  "id": 1,
  "fullName": "Nguyễn Văn A",
  "email": "a@gmail.com",
  "phone": "0901234567",
  "cccd": "001203000002",
  "role": "EMPLOYEE",
  "status": "Đang làm việc",
  "departmentId": 1,
  "departmentName": "IT",
  "positionId": 2,
  "positionTitle": "Developer",
  "salaryBase": 15000000
}
```

---

## 6. Module Phòng ban và Chức vụ

### 6.1. Hiện tại

FE:

- Dùng select phòng ban và chức vụ trong màn nhân viên.
- Chưa có màn CRUD riêng cho phòng ban/chức vụ.

BE:

- Có API list thông qua EmployeeController:

```http
GET /api/admin/employees/departments
GET /api/admin/employees/positions
```

DB:

- Bảng `departments`:

```text
department_id
department_name
```

- Bảng `positions`:

```text
position_id
position_name
```

### 6.2. Vấn đề hiện tại

Nghiệp vụ yêu cầu:

```text
Chọn phòng ban IT thì chỉ hiện chức vụ thuộc IT.
Chọn phòng ban Marketing thì chỉ hiện chức vụ thuộc Marketing.
```

Nhưng DB hiện tại chưa có `positions.department_id`, nên FE chưa lọc chức vụ theo DB thật được.

### 6.3. Thiếu cần bổ sung

| Bên | Cần bổ sung |
| --- | --- |
| FE | Không lọc chức vụ bằng tên phòng ban hard-code |
| FE | Lọc chức vụ bằng `position.departmentId` |
| BE | API positions trả thêm `departmentId` |
| BE | Có CRUD phòng ban nếu Admin cần quản lý |
| BE | Có CRUD chức vụ nếu Admin cần quản lý |
| DB | Thêm `department_id` vào `positions` |

### 6.4. Schema đề xuất

```sql
ALTER TABLE positions
ADD COLUMN department_id INT NULL;
```

Response positions chuẩn:

```json
[
  {
    "id": 1,
    "title": "Developer",
    "departmentId": 1
  }
]
```

---

## 7. Module Manager

### 7.1. Hiện tại

FE:

- Chưa có giao diện Manager riêng.
- `page.tsx` hiện mới chia `admin` và `employee`.
- Sidebar Admin đang chứa nhiều chức năng Admin/HR.

BE:

- Chưa có `ManagerController`.
- Chưa có API `/api/manager/...`.
- Manager nếu dùng API admin sẽ bị quá quyền.

DB:

- Có thể xác định Manager bằng:

```text
employees.role = 'MANAGER'
employees.department_id
```

### 7.2. Thiếu cần bổ sung

| Bên | Cần bổ sung |
| --- | --- |
| FE | Thêm role `manager` |
| FE | Tạo Manager layout hoặc Manager mode |
| FE | Manager Dashboard phòng ban |
| FE | Manager xem nhân viên trong phòng ban |
| FE | Manager giao task |
| FE | Manager review task |
| FE | Manager xem đánh giá năng lực phòng ban |
| BE | Tạo `ManagerController` |
| BE | API chỉ trả nhân viên cùng phòng ban |
| BE | API kiểm tra Manager không thao tác ngoài phòng ban |
| DB | Dùng `department_id` để scope quyền Manager |

### 7.3. API Manager chuẩn cần làm

```http
GET /api/manager/employees
GET /api/manager/tasks
POST /api/manager/tasks
GET /api/manager/tasks/{id}
PUT /api/manager/tasks/{id}
POST /api/manager/tasks/{id}/review
GET /api/manager/competency
POST /api/manager/competency/{reviewId}/approve
```

Quy tắc:

- Manager chỉ thấy nhân viên cùng phòng ban.
- Manager chỉ giao task cho nhân viên cùng phòng ban.
- Manager chỉ review task của phòng ban mình.
- Manager không được sửa role, lương, account admin.

---

## 8. Module Task

### 8.1. Hiện tại

FE:

- Chưa có màn chính thức cho Manager giao task.
- Employee Attendance có phần work report/task mẫu, nhưng chưa phải task từ Manager giao.

BE:

- Chưa có TaskController.
- Chưa có TaskService.
- Chưa có Task DTO.

DB:

- Chưa có các bảng:

```text
tasks
task_progress_logs
task_reviews
```

### 8.2. Thiếu cần bổ sung

| Bên | Cần bổ sung |
| --- | --- |
| FE Manager | Màn tạo task |
| FE Manager | Màn xem tiến độ task |
| FE Manager | Màn review task |
| FE Employee | Màn xem task được giao |
| FE Employee | Màn cập nhật tiến độ |
| FE Employee | Nút gửi hoàn thành |
| BE | `TaskController` cho Manager |
| BE | `EmployeeTaskController` cho Employee |
| BE | Service kiểm tra quyền theo phòng ban |
| DB | Bảng `tasks` |
| DB | Bảng `task_progress_logs` |
| DB | Bảng `task_reviews` |

### 8.3. Schema Task chuẩn

```text
tasks
- task_id
- employee_id
- manager_id
- department_id
- title
- description
- deadline
- priority
- status
- progress_percent
- expected_score
- created_at
- updated_at
```

```text
task_progress_logs
- progress_id
- task_id
- employee_id
- progress_percent
- note
- created_at
```

```text
task_reviews
- review_id
- task_id
- manager_id
- quality_score
- deadline_score
- decision
- comment
- created_at
```

### 8.4. Status Task chuẩn

| Status | Ý nghĩa |
| --- | --- |
| `NEW` | Task mới |
| `IN_PROGRESS` | Đang làm |
| `SUBMITTED` | Nhân viên gửi hoàn thành |
| `APPROVED` | Manager duyệt |
| `REJECTED` | Manager từ chối |
| `REVISION_REQUIRED` | Yêu cầu sửa lại |
| `OVERDUE` | Quá hạn |

---

## 9. Module Đánh giá năng lực Agentic AI

### 9.1. Hiện tại

FE:

- File: `frontend/app/components/CompetencyEvaluation.tsx`.
- Service: `frontend/services/competency.ts`.
- Đã gọi API:

```http
GET /api/admin/competency
GET /api/admin/competency/dashboard
GET /api/admin/competency/{employeeId}/analyze
```

- Có fallback data nếu API lỗi.

BE:

- Controller: `CompetencyController`.
- Service: `CompetencyService`.
- Hiện đang tính rule-based.
- Đang dùng attendance thật nhưng performance/skill còn suy luận đơn giản.
- Chưa dùng task Manager giao.
- Chưa có trạng thái Manager duyệt kết quả AI.

DB:

- Chưa có bảng `competency_reviews`.
- Chưa có bảng task nên AI chưa có dữ liệu hiệu suất thật.

### 9.2. Vấn đề nghiệp vụ

Hiện tại chưa đúng hoàn toàn với đề tài Agentic AI vì:

- AI chưa lấy dữ liệu từ task do Manager giao.
- AI chưa có vòng lặp đề xuất -> Manager duyệt.
- AI chưa lưu kết quả đánh giá vào DB.
- AI chưa có trạng thái `DRAFT`, `PENDING_APPROVAL`, `APPROVED`.

### 9.3. Thiếu cần bổ sung

| Bên | Cần bổ sung |
| --- | --- |
| FE | Màn Manager xem AI phân tích nhân viên |
| FE | Nút tạo đánh giá AI |
| FE | Nút duyệt/từ chối kết quả AI |
| FE | Hiển thị dữ liệu task ảnh hưởng đến điểm |
| BE | Tính điểm dựa trên task, attendance, leave, review |
| BE | Lưu kết quả vào `competency_reviews` |
| BE | API Manager generate/approve |
| DB | Bảng `competency_reviews` |

### 9.4. Công thức chuẩn

```text
Tổng điểm =
    Chuyên cần * 20%
  + Hiệu suất task * 40%
  + Chất lượng/kỹ năng * 25%
  + Kỷ luật/trách nhiệm * 15%
```

AI chỉ được đề xuất, Manager/HR là người duyệt cuối.

---

## 10. Module Chấm công

### 10.1. Hiện tại

FE:

- Admin: `frontend/app/components/AttendanceApproval.tsx`.
- Employee: `frontend/app/employees/Attendance.tsx`.
- Cả hai đang dùng dữ liệu mẫu.
- Chưa có `frontend/services/attendance.ts`.

BE:

- Controller: `AttendanceController`.
- Service: `AttendanceService`.
- API hiện có:

```http
POST /api/admin/attendance/checkin/{empId}
POST /api/admin/attendance/checkout/{empId}
GET /api/admin/attendance?date=yyyy-MM-dd
GET /api/admin/attendance/summary?date=yyyy-MM-dd
GET /api/admin/attendance/report?year=2026&month=6
```

DB:

- Bảng `attendance`.

### 10.2. Điểm cần kiểm tra kỹ

Trong model `Attendance.cs` có attribute:

```text
date
check_in_time
check_out_time
total_hours
is_late
is_early_leave
note
status
```

Nhưng trong `AppDbContext.cs` lại map:

```text
work_date
check_in
check_out
```

và ignore:

```text
TotalHours
IsLate
IsEarlyLeave
Note
Status
CreatedAt
UpdatedAt
```

Vì vậy TV2 phải kiểm tra schema MySQL thật rồi chuẩn hóa lại. Đây là điểm dễ gây lỗi khi chấm công.

### 10.3. Thiếu cần bổ sung

| Bên | Cần bổ sung |
| --- | --- |
| FE | Tạo `frontend/services/attendance.ts` |
| FE Admin | Gọi API danh sách chấm công theo ngày |
| FE Admin | Gọi API summary |
| FE Employee | Gọi API check-in/check-out |
| FE Employee | Gọi API lịch sử cá nhân |
| BE | API employee scoped: `/api/employee/attendance/...` |
| BE | API duyệt bổ sung/chỉnh sửa chấm công |
| DB | Bảng `attendance_requests` nếu có đơn bổ sung/chỉnh sửa |
| DB | Chuẩn hóa tên cột attendance |

### 10.4. API cần bổ sung

```http
GET /api/employee/attendance/me?month=6&year=2026
POST /api/employee/attendance/checkin
POST /api/employee/attendance/checkout
POST /api/employee/attendance/requests
GET /api/admin/attendance/requests
POST /api/admin/attendance/requests/{id}/approve
POST /api/admin/attendance/requests/{id}/reject
```

---

## 11. Module Nghỉ phép

### 11.1. Hiện tại

FE:

- Admin: `frontend/app/components/Leave.tsx`.
- Employee: `frontend/app/employees/EmployeeLeave.tsx`.
- Cả hai đang dùng dữ liệu mẫu.
- Chưa có `frontend/services/leave.ts`.
- FE đang dùng status tiếng Anh:

```text
pending
approved
rejected
```

BE:

- Controller: `LeaveRequestController`.
- Service: `LeaveRequestService`.
- API hiện có:

```http
GET /api/admin/leave-requests
POST /api/admin/leave-requests
POST /api/admin/leave-requests/{id}/approve
POST /api/admin/leave-requests/{id}/reject
GET /api/admin/leave-requests/dashboard
```

- BE đang dùng status tiếng Việt:

```text
Chờ duyệt
Đã duyệt
Từ chối
```

DB:

- Bảng `leave_requests`.
- Bảng `leave_types`.

### 11.2. Thiếu cần bổ sung

| Bên | Cần bổ sung |
| --- | --- |
| FE | Tạo `frontend/services/leave.ts` |
| FE | Đổi status theo API hoặc map status rõ ràng |
| FE Employee | Gửi đơn nghỉ phép qua API |
| FE Employee | Xem đơn nghỉ phép của chính mình |
| FE Admin/Manager | Duyệt/từ chối qua API |
| BE | API employee scoped |
| BE | API lấy leave types |
| BE | Kiểm tra số ngày nghỉ hợp lệ |
| DB | Bảng số dư phép nếu muốn làm đúng nghiệp vụ |

### 11.3. API cần bổ sung

```http
GET /api/leave-types
GET /api/employee/leave-requests
POST /api/employee/leave-requests
GET /api/manager/leave-requests
POST /api/manager/leave-requests/{id}/approve
POST /api/manager/leave-requests/{id}/reject
```

---

## 12. Module Lương

### 12.1. Hiện tại

FE:

- File: `frontend/app/components/Salary.tsx`.
- File Employee: `frontend/app/employees/EmployeeSalary.tsx`.
- Cả hai đang dùng dữ liệu mẫu.
- Chưa có `frontend/services/salary.ts`.
- FE salary đang có nhiều field chi tiết:

```text
mealAllowance
transportAllowance
phoneAllowance
housingAllowance
overtimeHours
kpiBonus
projectBonus
insurance
tax
advancePayment
penalties
```

BE:

- Controller: `SalaryController`.
- Service: `SalaryService`.
- API hiện có:

```http
GET /api/admin/salary/dashboard
GET /api/admin/salary
POST /api/admin/salary/calculate
POST /api/admin/salary/{id}/approve
POST /api/admin/salary/{id}/pay
```

- BE hiện tính đơn giản:

```text
totalSalary = salaryBase
bonus = 0
deductions = 0
```

- Controller đang `[Authorize(Roles = "ADMIN,HR")]`, nhưng role chuẩn đang chốt là `ADMIN`, `MANAGER`, `EMPLOYEE`. Role `HR` cần xử lý lại.

DB:

- Bảng `payroll` hiện có:

```text
employee_id
month
year
salary_base
bonus
deductions
total_salary
status
```

### 12.2. Vấn đề hiện tại

FE mô phỏng lương rất chi tiết, nhưng BE/DB chỉ có payroll đơn giản. Nếu để nguyên thì sẽ lệch:

```text
FE hiển thị phụ cấp, bảo hiểm, thuế, OT
nhưng DB không lưu các khoản đó
```

### 12.3. Hướng thống nhất đề xuất

Với đồ án hiện tại, nên chọn hướng đơn giản để kịp demo:

```text
salaryBase + bonus - deductions = totalSalary
```

Sau này nếu cần nâng cấp mới thêm phụ cấp, OT, thuế, bảo hiểm.

### 12.4. Thiếu cần bổ sung

| Bên | Cần bổ sung |
| --- | --- |
| FE | Tạo `frontend/services/salary.ts` |
| FE | Gọi API payroll thật thay vì dữ liệu mẫu |
| FE | Đồng bộ status với BE |
| FE Employee | API xem lương của chính mình |
| BE | Đổi role authorize từ `HR` về role chuẩn |
| BE | API employee salary |
| BE | Nếu giữ UI chi tiết thì phải mở rộng Payroll |
| DB | Nếu giữ UI chi tiết thì thêm cột phụ cấp/thuế/bảo hiểm/OT |

### 12.5. API cần bổ sung

```http
GET /api/employee/salary?month=6&year=2026
GET /api/employee/salary/history
```

---

## 13. Module Chatbot / AI Assistant

### 13.1. Hiện tại

FE:

- Component: `frontend/app/components/Chatbot.tsx`.
- Service: `frontend/services/chatbot.ts`.
- Đã gọi API thật:

```http
POST /chat/session
GET /chat/sessions
GET /chat/history/{sessionId}
POST /chat
DELETE /chat/session/{sessionId}
```

BE:

- Controller: `ChatController`.
- Đang lưu session bằng `ConcurrentDictionary` trong RAM.
- Khi restart backend thì mất lịch sử chat.
- Reply đang là rule-based theo keyword.

DB:

- Hiện `AppDbContext` chưa map bảng chat.
- Nếu MySQL có `chat_sessions`, `chat_history` thì BE vẫn chưa dùng.

### 13.2. Thiếu cần bổ sung

| Bên | Cần bổ sung |
| --- | --- |
| FE | Lấy `userId` từ user login thay vì hard-code |
| FE | Gửi token nếu chat cần phân quyền |
| BE | Lưu session/history vào MySQL |
| BE | Không lưu in-memory nếu muốn public nhiều người dùng |
| BE | Agentic AI cần lấy context từ HRM thật |
| DB | Bảng `chat_sessions`, `chat_history` nếu dùng lâu dài |

### 13.3. Hướng đúng cho đề tài

Chatbot không nên là phần chính của Agentic AI. Nó là AI Assistant hỗ trợ hỏi đáp.

Phần chính của đề tài vẫn là:

```text
Manager Task -> Employee Progress -> Manager Review -> Agentic AI Evaluation
```

API nền cho luồng này đã được mô tả tại:

```text
TAI_LIEU_API_TV3_AGENTIC_AI.md
```

---

## 14. Module Dashboard

### 14.1. Hiện tại

FE:

- File: `frontend/app/components/Dashboard.tsx`.
- Đang dùng số liệu mẫu:

```text
125 nhân viên
2.1 tỷ lương
7 nghỉ phép hôm nay
87% hiệu suất
```

BE:

- Chưa có dashboard API tổng hợp.

DB:

- Có thể lấy từ các bảng:

```text
employees
payroll
leave_requests
attendance
competency_reviews
```

### 14.2. Thiếu cần bổ sung

| Bên | Cần bổ sung |
| --- | --- |
| FE | Tạo `frontend/services/dashboard.ts` |
| FE | Gọi API dashboard |
| BE | Tạo `DashboardController` |
| BE | Tổng hợp dữ liệu từ nhiều bảng |
| DB | Không cần bảng mới, chỉ cần query |

### 14.3. API cần bổ sung

```http
GET /api/admin/dashboard?month=6&year=2026
GET /api/manager/dashboard?month=6&year=2026
GET /api/employee/dashboard
```

---

## 15. Module Reports

### 15.1. Hiện tại

FE:

- File: `frontend/app/components/Reports.tsx`.
- Đang dùng dữ liệu mẫu.
- Tạo/tải report chỉ là alert/demo.

BE:

- Chưa có ReportController.

DB:

- Chưa có bảng report.

### 15.2. Thiếu cần bổ sung

| Bên | Cần bổ sung |
| --- | --- |
| FE | Tạo `frontend/services/reports.ts` nếu làm report thật |
| BE | API tạo report |
| BE | API tải report |
| DB | Bảng `reports` nếu lưu lịch sử report |

### 15.3. Gợi ý cho đồ án

Nếu không đủ thời gian, Reports có thể để mức demo UI. Nhưng phải ghi rõ trong báo cáo:

```text
Module báo cáo đang ở mức mô phỏng giao diện, chưa phát sinh file thật.
```

---

## 16. Module Analytics

### 16.1. Hiện tại

FE:

- File: `frontend/app/components/Analytics.tsx`.
- Đang dùng dữ liệu mẫu.

BE:

- Chưa có AnalyticsController.

DB:

- Có thể query từ các bảng HRM hiện có.

### 16.2. Thiếu cần bổ sung

| Bên | Cần bổ sung |
| --- | --- |
| FE | Tạo service analytics nếu muốn dữ liệu thật |
| BE | API thống kê nhân sự, nghỉ phép, lương, năng lực |
| DB | Không cần bảng mới nếu chỉ thống kê |

API đề xuất:

```http
GET /api/admin/analytics/headcount
GET /api/admin/analytics/department-distribution
GET /api/admin/analytics/salary-trend
GET /api/admin/analytics/competency-trend
```

---

## 17. Employee Portal

### 17.1. Hiện tại

FE:

- Có các file:

```text
frontend/app/employees/EmployeeDashboard.tsx
frontend/app/employees/EmployeeProfile.tsx
frontend/app/employees/Attendance.tsx
frontend/app/employees/EmployeeLeave.tsx
frontend/app/employees/EmployeeSalary.tsx
```

- Hầu hết đang dùng dữ liệu mẫu.
- Chưa lấy user thật từ login/JWT.

BE:

- Có một số API admin có thể dùng lại logic.
- Chưa có API employee scoped.

DB:

- Dữ liệu nằm trong các bảng HRM chung.

### 17.2. Thiếu cần bổ sung

| Bên | Cần bổ sung |
| --- | --- |
| FE | Lấy employeeId từ token/user login |
| FE | Gọi API profile thật |
| FE | Gọi API attendance thật |
| FE | Gọi API leave thật |
| FE | Gọi API salary thật |
| FE | Gọi API task thật |
| BE | Tạo `EmployeeController` riêng hoặc route `/api/employee/...` |
| BE | API chỉ trả dữ liệu của chính nhân viên đang login |
| DB | Không cần bảng riêng, dùng employeeId làm khóa |

### 17.3. API Employee cần làm

```http
GET /api/employee/profile
PUT /api/employee/profile
GET /api/employee/dashboard
GET /api/employee/attendance/me
POST /api/employee/attendance/checkin
POST /api/employee/attendance/checkout
GET /api/employee/leave-requests
POST /api/employee/leave-requests
GET /api/employee/salary/history
GET /api/employee/tasks
PUT /api/employee/tasks/{id}/progress
POST /api/employee/tasks/{id}/submit
```

---

## 18. Service FE cần tạo thêm

Hiện tại đã có:

```text
frontend/services/chatbot.ts
frontend/services/competency.ts
frontend/services/employees.ts
```

Cần bổ sung:

```text
frontend/services/auth.ts
frontend/services/departments.ts
frontend/services/positions.ts
frontend/services/attendance.ts
frontend/services/leave.ts
frontend/services/salary.ts
frontend/services/tasks.ts
frontend/services/manager.ts
frontend/services/dashboard.ts
frontend/services/reports.ts
frontend/services/analytics.ts
frontend/services/employeePortal.ts
```

Quy tắc:

- Component không gọi fetch trực tiếp tràn lan.
- Mỗi module có service riêng.
- Type response phải đặt trong service hoặc file types chung.
- FE không tự khai báo type lệch với API.

---

## 19. Backend cần bổ sung

Hiện tại đã có controller:

```text
AuthController
EmployeeController
AttendanceController
LeaveRequestController
SalaryController
CompetencyController
ChatController
```

Cần bổ sung:

```text
ManagerController
TaskController
EmployeePortalController
DashboardController
DepartmentController
PositionController
ReportController
AnalyticsController
```

Cần bổ sung service:

```text
TaskService
ManagerService
DashboardService
ReportService
AnalyticsService
EmployeePortalService
```

Cần bổ sung DTO:

```text
CreateEmployeeDto
EmployeeResponseDto
CreateTaskDto
TaskDto
UpdateTaskProgressDto
TaskReviewDto
CompetencyReviewDto
DashboardDto
```

---

## 20. Database cần bổ sung

File SQL đã tạo để bổ sung schema:

```text
backend/Admin/Database/migrations/001_add_agentic_hrm_missing_schema.sql
```

Hướng dẫn chạy:

```text
backend/Admin/Database/README.md
```

### 20.1. Bảng/cột cần thêm sớm

| Bảng/cột | Lý do |
| --- | --- |
| `positions.department_id` | Lọc chức vụ theo phòng ban |
| `tasks` | Manager giao task |
| `task_progress_logs` | Nhân viên cập nhật tiến độ |
| `task_reviews` | Manager review task |
| `competency_reviews` | Lưu kết quả AI đánh giá |
| `attendance_requests` | Nhân viên xin bổ sung/chỉnh sửa chấm công |
| Cột chi tiết trong `payroll` | Đồng bộ với UI lương hiện tại nếu giữ phụ cấp, OT, thuế, bảo hiểm |
| `notifications` | Thông báo task mới, duyệt nghỉ phép, lương, đánh giá năng lực |

### 20.2. Bảng có thể thêm sau

| Bảng | Lý do |
| --- | --- |
| `leave_balances` | Quản lý số ngày phép còn lại |
| `reports` | Lưu lịch sử report |
| `chat_sessions` | Lưu session chatbot |
| `chat_history` | Lưu lịch sử chatbot |

### 20.3. Index/constraint cần có

```sql
UNIQUE employees.email
UNIQUE employees.cccd
INDEX employees.department_id
INDEX employees.position_id
INDEX tasks.employee_id
INDEX tasks.manager_id
INDEX tasks.department_id
INDEX attendance.employee_id
INDEX leave_requests.employee_id
INDEX payroll.employee_id
```

---

## 21. Thứ tự làm để không loạn

### Giai đoạn 1: Chốt nền tảng

| Việc | Người phụ trách |
| --- | --- |
| Chuẩn role `ADMIN`, `MANAGER`, `EMPLOYEE` | TV2 + TV1 |
| FE login gọi API thật | TV1 |
| BE login trả user info | TV2 |
| JWT lưu và gửi từ FE | TV1 |
| Thêm role Manager vào routing FE | TV1 |

### Giai đoạn 2: Chuẩn Nhân viên - Phòng ban - Chức vụ

| Việc | Người phụ trách |
| --- | --- |
| Thêm `positions.department_id` | TV2 |
| API positions trả `departmentId` | TV2 |
| FE lọc chức vụ theo `departmentId` | TV1 |
| CRUD Department/Position nếu cần | TV2 + TV1 |

### Giai đoạn 3: Làm Manager Task

| Việc | Người phụ trách |
| --- | --- |
| Tạo bảng task/progress/review | TV2 |
| API Manager task | TV2 |
| UI Manager giao task | TV1 |
| UI Employee nhận/cập nhật task | TV4 |
| Logic tính điểm từ task | TV3 |

### Giai đoạn 4: Làm Agentic AI đúng đề tài

| Việc | Người phụ trách |
| --- | --- |
| Công thức điểm chính thức | TV3 |
| API generate competency | TV2 + TV3 |
| Lưu competency review | TV2 |
| UI Manager duyệt kết quả AI | TV1 |
| UI Employee xem kết quả cá nhân nếu cần | TV4 |

### Giai đoạn 5: Đồng bộ các module còn lại

| Module | Việc chính | Người phụ trách |
| --- | --- | --- |
| Chấm công | FE bỏ fake, gọi API thật | TV2 + TV4 + TV1 |
| Nghỉ phép | FE bỏ fake, gọi API thật | TV2 + TV4 + TV1 |
| Lương | FE bỏ fake, gọi API thật | TV2 + TV1 + TV4 |
| Dashboard | API tổng hợp dữ liệu thật | TV2 + TV1 |
| Reports | Quyết định demo hay API thật | TV2 + TV4 |
| Analytics | API thống kê thật nếu đủ thời gian | TV2 + TV1 |

---

## 22. Checklist bắt buộc khi một người thêm chức năng

Trước khi tạo PR, phải tự kiểm tra:

```text
[ ] FE có service gọi API chưa?
[ ] BE có controller/service/DTO chưa?
[ ] DB có bảng/cột chưa?
[ ] Tên field FE có đúng contract không?
[ ] Status/role có đúng chuẩn không?
[ ] API có kiểm tra quyền không?
[ ] FE có xử lý loading/error/success không?
[ ] Không còn alert mặc định nếu đã thống nhất dùng popup/toast.
[ ] Không còn dữ liệu mẫu nếu API đã có.
[ ] Reload trang dữ liệu có còn không?
[ ] Không push password DB/JWT secret.
[ ] Có cập nhật tài liệu nếu đổi logic.
```

---

## 23. Kết luận

Trạng thái hiện tại của project:

- Nhân viên là module gần đồng bộ nhất.
- Competency đã có UI/API nhưng mới là demo rule-based, chưa đúng hướng Agentic AI task-based.
- Chatbot đã gọi API nhưng chưa lưu DB.
- Lương, nghỉ phép, chấm công có BE nhưng FE vẫn dùng dữ liệu mẫu.
- Dashboard, reports, analytics chủ yếu là UI demo.
- Manager/task là phần quan trọng nhất cho đề tài nhưng hiện chưa đủ FE/BE/DB.

Thứ tự ưu tiên đúng:

```text
Auth thật
-> Role Manager
-> Nhân viên/phòng ban/chức vụ chuẩn
-> Manager giao task
-> Employee cập nhật task
-> Manager review task
-> Agentic AI đánh giá năng lực
-> Đồng bộ lương/nghỉ phép/chấm công/dashboard
```

File này dùng làm checklist merge code của cả nhóm.
