# TV3 - Agentic AI va logic danh gia nang luc

## 1. Vai tro cua TV3

TV3 phu trach module Agentic AI danh gia nang luc trong he thong HRM.

Pham vi chinh:

- Thiet ke luong nghiep vu Manager giao task cho nhan vien.
- Xay dung logic nhan vien cap nhat tien do task.
- Xay dung logic Manager review task.
- Tong hop du lieu task, cham cong, nghi phep de tinh diem nang luc.
- Tao nhan xet AI va de xuat hanh dong cho Manager/HR.
- Viet API contract de TV1, TV2, TV4 ghep chuc nang dong nhat.

TV3 khong phai nguoi lam toan bo frontend/backend, nhung TV3 phai chot logic de cac phan khac lam dung.

## 2. Tu tu lam viec hien tai

### Buoc 1. Lam task lam nguon du lieu danh gia

Ly do: he thong khong nen de AI tu tuong tuong KPI. KPI/nang luc phai co nguon du lieu ro rang.

Nguon du lieu chinh:

- Task do Manager giao.
- Tien do do Employee cap nhat.
- Ket qua review do Manager xac nhan.

Trang thai task:

| Status | Y nghia |
|---|---|
| NEW | Manager vua giao task, nhan vien chua lam |
| IN_PROGRESS | Nhan vien dang cap nhat tien do |
| SUBMITTED | Nhan vien gui hoan thanh, cho Manager duyet |
| APPROVED | Manager da duyet hoan thanh |
| REVISION_REQUIRED | Manager yeu cau sua lai |
| REJECTED | Manager tu choi ket qua |
| OVERDUE | Task qua han |

### Buoc 2. Lay du lieu bo sung tu HRM

Agentic AI khong chi nhin task, ma phai ket hop voi cac module HRM khac:

| Module | Du lieu dung de danh gia |
|---|---|
| Employees | Ho ten, phong ban, chuc vu, vai tro |
| Departments | Gioi han Manager chi xem nhan vien cung phong ban |
| Positions | Biet vai tro cong viec cua nhan vien |
| Attendance | Di tre, ve som, thieu check-in/check-out |
| Leave Requests | Nghi phep hop le, tranh phat sai |
| Tasks | Hieu suat, deadline, tien do |
| Task Reviews | Chat luong task do Manager cham |

### Buoc 3. Agentic AI tinh diem

Cong thuc dang dung:

```text
Tong diem =
  Chuyen can * 20%
+ Hieu suat task * 40%
+ Chat luong/ky nang * 25%
+ Ky luat/trach nhiem * 15%
```

Chi tiet:

| Tieu chi | Trong so | Nguon du lieu |
|---|---:|---|
| Chuyen can | 20% | attendance, leave_requests |
| Hieu suat task | 40% | tasks, task_progress_logs |
| Chat luong/ky nang | 25% | task_reviews.quality_score, deadline_score |
| Ky luat/trach nhiem | 15% | deadline, tien do, cham cong |

### Buoc 3.1. Chia ky danh gia theo thang

Task va AI danh gia nang luc phai chay theo ky thang, khong lay toan bo lich su.

Ly do:

- Neu khong chia thang, task se dai dan va UI kho quan ly.
- Diem AI bi cong ca task cu, khong phan anh dung hieu suat hien tai.
- Bao cao HRM thuong theo thang/ky luong/ky danh gia.
- Manager can xem lai lich su thang cu nhung khong de no anh huong thang moi.

Quy uoc hien tai:

```text
Ky danh gia = month + year
Vi du: 06/2026
```

Task duoc tinh trong ky khi:

```text
task.created_at <= ngay cuoi thang
va task.deadline >= ngay dau thang
```

Nghia la:

- Task tao va ket thuc trong thang do se hien.
- Task dai han keo qua nhieu thang van hien trong cac thang no con hieu luc.
- Task cu da ket thuc thang truoc khong bi cong vao AI thang nay.

API task da ho tro query:

```text
GET /api/manager/tasks?managerId=2&month=6&year=2026
GET /api/employee/tasks?employeeId=5&month=6&year=2026
```

API Agentic AI cung dung cung ky:

```text
POST /api/manager/agentic-ai/analyze
Body: { "managerId": 0, "employeeId": 5, "month": 6, "year": 2026, "persistReview": true }
```

Luồng dung:

1. Manager chon ky danh gia.
2. Manager giao task cho nhan vien trong phong ban.
3. Employee xem task theo cung ky.
4. Employee cap nhat tien do va submit.
5. Manager review task.
6. Manager bam AI danh gia nang luc.
7. AI chi lay task/review/cham cong/nghi phep trong ky dang chon.

### Buoc 4. AI tao nhan xet va de xuat

AI tao ra:

- Tom tat ket qua danh gia.
- Diem tung tieu chi.
- Xep loai nhan vien.
- De xuat hanh dong cho Manager/HR.

Vi du de xuat:

```text
Nhan vien co hieu suat task tot va hoan thanh dung han. De xuat giao task co do kho cao hon hoac dua vao nhom nhan su tiem nang.
```

```text
Nhan vien co task qua han va it cap nhat tien do. De xuat Manager theo doi hang tuan, chia nho task va trao doi truc tiep.
```

### Buoc 5. Manager duyet ket qua

AI chi ho tro ra quyet dinh. Ket qua cuoi cung phai do Manager hoac HR duyet.

Trang thai danh gia:

| Status | Y nghia |
|---|---|
| DRAFT | Ban nhap |
| PENDING_APPROVAL | AI da generate, cho Manager duyet |
| APPROVED | Manager dong y |
| REJECTED | Manager tu choi, can xem lai du lieu |

## 3. API TV3 hien co

### 3.1. Manager Task API

Base URL:

```text
/api/manager/tasks
```

| Method | Endpoint | Cong dung |
|---|---|---|
| GET | `/api/manager/tasks?managerId={id}` | Lay task Manager duoc quan ly |
| GET | `/api/manager/tasks/{taskId}` | Lay chi tiet task |
| POST | `/api/manager/tasks?managerId={id}` | Manager tao task |
| PUT | `/api/manager/tasks/{taskId}?managerId={id}` | Manager sua task |
| POST | `/api/manager/tasks/{taskId}/review?managerId={id}` | Manager review task |

### 3.2. Employee Task API

Base URL:

```text
/api/employee/tasks
```

| Method | Endpoint | Cong dung |
|---|---|---|
| GET | `/api/employee/tasks?employeeId={id}` | Nhan vien xem task cua minh |
| PUT | `/api/employee/tasks/{taskId}/progress?employeeId={id}` | Cap nhat tien do |
| POST | `/api/employee/tasks/{taskId}/submit?employeeId={id}` | Gui hoan thanh task |

### 3.3. Manager Competency API

Base URL:

```text
/api/manager/competency
```

| Method | Endpoint | Cong dung |
|---|---|---|
| GET | `/api/manager/competency?managerId={id}&month={m}&year={y}` | Xem ket qua danh gia trong ky |
| GET | `/api/manager/competency/{employeeId}/input-data?managerId={id}&month={m}&year={y}` | Xem du lieu dau vao AI |
| POST | `/api/manager/agentic-ai/analyze` | Chay workflow Agentic AI va luu ket qua hop le |
| POST | `/api/manager/competency/{reviewId}/approve?managerId={id}` | Duyet ket qua AI |
| POST | `/api/manager/competency/{reviewId}/reject?managerId={id}` | Tu choi ket qua AI |

## 4. Request mau

### Manager tao task

```json
{
  "employeeId": 6,
  "title": "Hoan thanh module xin nghi phep",
  "description": "Lam API, validate va test luong gui don nghi phep",
  "deadline": "2026-06-20T17:00:00",
  "priority": "HIGH",
  "expectedScore": 100
}
```

### Employee cap nhat tien do

```json
{
  "progressPercent": 70,
  "note": "Da xong API va dang test voi frontend"
}
```

### Manager review task

```json
{
  "qualityScore": 85,
  "deadlineScore": 90,
  "decision": "APPROVED",
  "comment": "Hoan thanh dung yeu cau, can bo sung them test case"
}
```

### Generate danh gia nang luc

```json
{
  "month": 6,
  "year": 2026
}
```

### Manager duyet ket qua AI

```json
{
  "managerNote": "Dong y voi de xuat cua AI"
}
```

## 5. Luong demo TV3

Thu tu demo dung nhat:

1. Dang nhap bang tai khoan Manager.
2. Manager chon nhan vien trong phong ban.
3. Manager tao task, dat deadline va muc uu tien.
4. Neu giao sai thong tin, Manager co the chinh sua task khi task chua dong.
5. Dang nhap bang tai khoan Employee.
6. Employee xem task moi.
7. Employee cap nhat tien do.
8. Employee submit task.
9. Manager review task va cham diem chat luong.
10. Neu chua dat, Manager chon `REVISION_REQUIRED` de mo lai task cho Employee sua.
11. Neu dat, Manager chon `APPROVED` de dong task.
12. Neu khong nghiem thu, Manager chon `REJECTED` de huy/tu choi task.
13. Manager vao danh gia nang luc.
14. Manager xem input-data cua AI.
15. Manager generate ket qua danh gia.
16. Manager approve hoac reject ket qua.

## 6. Ranh gioi voi cac thanh vien khac

### TV1 - Frontend Admin + Manager

Can ghep cac service:

- `frontend/services/tasks.ts`
- `frontend/services/managerCompetency.ts`

Man hinh can lam:

- Manager Task List.
- Tao/Sua task.
- Review task.
- Xem ket qua Agentic AI.
- Duyet/tu choi danh gia.

### TV2 - Backend + Database

Can dong bo:

- Chay migration task va competency.
- Sau nay thay query `managerId`, `employeeId` bang JWT.
- Them authorize theo role.
- Dam bao bang `tasks`, `task_progress_logs`, `task_reviews`, `competency_reviews` dung contract.

### TV4 - Frontend Employee + Document

Can ghep service:

- `fetchEmployeeTasks`
- `updateEmployeeTaskProgress`
- `submitEmployeeTask`

Man hinh can lam:

- Task cua toi.
- Cap nhat tien do.
- Gui hoan thanh task.
- Xem phan hoi cua Manager.

## 7. File da bo sung cho TV3

| File | Muc dich |
|---|---|
| `frontend/services/tasks.ts` | Service goi API task cho Manager va Employee |
| `frontend/services/managerCompetency.ts` | Service goi API Agentic AI danh gia nang luc |
| `frontend/app/components/ManagerTasks.tsx` | UI Manager giao task, review task va generate danh gia AI bang API that |
| `frontend/app/employees/EmployeeTasks.tsx` | UI Employee xem task, cap nhat tien do va submit task bang API that |
| `frontend/app/employees/EmployeeSidebar.tsx` | Them menu Task cua toi cho Employee |
| `frontend/app/page.tsx` | Gan route Employee Task vao ung dung |
| `TAI_LIEU_TV3_AGENTIC_AI_THUC_HIEN.md` | Tai lieu tong hop phan TV3 |

## 8. UI/UX da nang cap

### Employee Tasks

Man hinh Employee Tasks duoc thiet ke lai theo dashboard task ca nhan:

- Header co icon, tieu de, mo ta ngan, nut Refresh va Bo loc.
- KPI cards gom tong task, dang thuc hien, cho duyet, da hoan thanh.
- Tabs gom Tat ca, Moi giao, Dang lam, Cho duyet, Hoan thanh, Qua han.
- Moi task la card rieng, hien thi priority, status, deadline, so ngay con lai, Manager, diem ky vong va tien do.
- Progress bar doi mau theo muc tien do:
  - 0-30: do.
  - 31-70: cam.
  - 71-100: xanh.
- Co Activity Timeline gom Manager giao task, Employee cap nhat, Submit hoan thanh, Manager phan hoi.
- Task SUBMITTED/APPROVED/REJECTED bi khoa form de tranh sua sai trang thai nghiep vu.

### Manager Tasks

Man hinh Manager Tasks duoc thiet ke theo team management dashboard:

- Header co Giao Task, Refresh, Export Report.
- KPI cards gom Task dang mo, Cho duyet, Da hoan thanh, Qua han, Tien do trung binh.
- Advanced filters gom nhan vien, trang thai, do uu tien, deadline va tim kiem.
- Task duoc gom theo tung nhan vien de tranh nham khi moi nguoi co nhieu task.
- Moi nhan vien la mot card lon, hien thi tong task, task hoan thanh, task dang lam va diem trung binh.
- Task ben trong nhan vien hien thi dang accordion.
- Task SUBMITTED co Review Panel inline de Manager cham Quality Score, Deadline Score va Comment.
- Manager co the Approve, Revision Required hoac Reject.
- Nut AI Danh Gia Nang Luc mo modal tai cho, khong redirect sang trang khac.
- Modal AI hien thi diem nang luc, diem KPI, diem thai do, diem deadline, diem hop tac, nhan xet va khuyen nghi AI.

## 9. Noi dung bao cao ngan gon

Em phu trach phan TV3 la Agentic AI va logic danh gia nang luc. Em xay dung luong nghiep vu theo huong Manager giao task cho nhan vien, nhan vien cap nhat tien do, Manager review ket qua, sau do Agentic AI lay du lieu task, cham cong va nghi phep de tinh diem nang luc. He thong khong de AI tu quyet dinh hay tu tao KPI, ma AI chi tong hop du lieu that, tinh diem theo cong thuc va dua ra nhan xet/de xuat. Ket qua cuoi cung van do Manager hoac HR duyet. Phan nay giup module AI lien ket truc tiep voi quan ly nhan su, dung logic nghiep vu va co the merge voi frontend/backend cua cac thanh vien khac.
