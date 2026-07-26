# Tai lieu API TV3 - Agentic AI danh gia nang luc

## 1. Muc dich

File nay mo ta phan API do TV3 phu trach de sau nay merge voi TV2.

Pham vi API:

- Manager giao task cho nhan vien.
- Employee cap nhat tien do task.
- Manager review task.
- Agentic AI lay du lieu dau vao.
- Agentic AI generate danh gia nang luc.
- Manager approve/reject ket qua danh gia.

Luu y hien tai:

- API dang dung `managerId` va `employeeId` qua query de test local.
- Khi TV2 hoan thien Auth/JWT, co the thay `managerId`/`employeeId` bang thong tin lay tu token.
- Can chay SQL migration truoc khi test API:

```text
backend/Admin/Database/migrations/001_add_agentic_hrm_missing_schema.sql
```

---

## 2. API Manager Task

Base URL:

```text
/api/manager/tasks
```

### 2.1. Lay danh sach task cua Manager

```http
GET /api/manager/tasks?managerId=2
```

Y nghia:

- Neu `managerId` la `ADMIN`, xem duoc tat ca.
- Neu la `MANAGER`, chi xem task trong phong ban cua Manager.

### 2.2. Tao task

```http
POST /api/manager/tasks?managerId=2
```

Request:

```json
{
  "employeeId": 5,
  "title": "Hoan thanh bao cao thang",
  "description": "Tong hop du lieu nhan su cua phong ban",
  "deadline": "2026-06-20T17:00:00",
  "priority": "HIGH",
  "expectedScore": 100
}
```

Quy tac:

- Manager chi duoc giao task cho nhan vien cung phong ban.
- Task moi co status `NEW`.
- Tien do ban dau la `0`.

### 2.3. Sua task

```http
PUT /api/manager/tasks/{taskId}?managerId=2
```

Request:

```json
{
  "title": "Cap nhat bao cao thang",
  "description": "Bo sung them so lieu task",
  "deadline": "2026-06-21T17:00:00",
  "priority": "MEDIUM",
  "expectedScore": 90
}
```

Quy tac:

- Task da `APPROVED` thi khong duoc sua.

### 2.4. Review task

```http
POST /api/manager/tasks/{taskId}/review?managerId=2
```

Request:

```json
{
  "qualityScore": 85,
  "deadlineScore": 90,
  "decision": "APPROVED",
  "comment": "Hoan thanh dung yeu cau"
}
```

Decision hop le:

```text
APPROVED
REJECTED
REVISION_REQUIRED
```

---

## 3. API Employee Task

Base URL:

```text
/api/employee/tasks
```

### 3.1. Lay task cua nhan vien

```http
GET /api/employee/tasks?employeeId=5
```

### 3.2. Cap nhat tien do

```http
PUT /api/employee/tasks/{taskId}/progress?employeeId=5
```

Request:

```json
{
  "progressPercent": 70,
  "note": "Da hoan thanh phan tong hop du lieu"
}
```

Quy tac:

- Nhan vien chi duoc cap nhat task cua minh.
- Cap nhat 100% chua co nghia la hoan thanh neu Manager chua review.

### 3.3. Gui hoan thanh task

```http
POST /api/employee/tasks/{taskId}/submit?employeeId=5
```

Sau khi submit:

```text
status = SUBMITTED
progressPercent = 100
```

Manager van phai review moi thanh `APPROVED`.

---

## 4. API Agentic AI danh gia nang luc

Base URL:

```text
/api/manager/competency
```

### 4.1. Lay danh sach review nang luc cua phong ban

```http
GET /api/manager/competency?managerId=2&month=6&year=2026
```

### 4.2. Lay du lieu dau vao AI cua mot nhan vien

```http
GET /api/manager/competency/{employeeId}/input-data?managerId=2&month=6&year=2026
```

Du lieu tra ve gom:

- Thong tin nhan vien.
- Task trong ky.
- So task approved/rejected/revision/overdue.
- Diem quality/deadline trung binh tu Manager review.
- So lan cap nhat tien do.
- Du lieu cham cong.
- Du lieu nghi phep da duyet.

### 4.3. Chay workflow Agentic AI

```http
POST /api/manager/agentic-ai/analyze
Authorization: Bearer <token>
```

Request:

```json
{
  "managerId": 0,
  "employeeId": 6,
  "month": 6,
  "year": 2026,
  "goal": "Danh gia nang luc va de xuat hanh dong",
  "persistReview": true
}
```

Backend lay ManagerId that tu JWT, khong tin ManagerId do frontend gui len.

Cong thuc:

```text
Tong diem =
    Chuyen can * 20%
  + Hieu suat task * 40%
  + Chat luong/ky nang * 25%
  + Ky luat/trach nhiem * 15%
```

Ket qua duoc luu vao bang:

```text
competency_reviews
```

Status sau khi generate:

```text
PENDING_APPROVAL
```

### 4.4. Manager duyet ket qua danh gia

```http
POST /api/manager/competency/{reviewId}/approve?managerId=2
```

Request:

```json
{
  "managerNote": "Dong y voi de xuat cua AI"
}
```

### 4.5. Manager tu choi ket qua danh gia

```http
POST /api/manager/competency/{reviewId}/reject?managerId=2
```

Request:

```json
{
  "managerNote": "Can bo sung them du lieu task truoc khi danh gia"
}
```

---

## 5. Luong test demo

Thu tu test de demo dung nghiep vu:

```text
1. Manager tao task cho nhan vien
2. Employee xem task moi
3. Employee cap nhat tien do
4. Employee submit task
5. Manager review task
6. Manager goi API input-data de xem du lieu AI
7. Manager generate competency review
8. Manager approve/reject ket qua
```

---

## 6. Ghi chu khi merge voi TV2

Phan TV2 can lam tiep:

- Thay `managerId` query bang Manager lay tu JWT token.
- Thay `employeeId` query bang Employee lay tu JWT token.
- Them `[Authorize(Roles = "MANAGER,ADMIN")]` cho API Manager.
- Them `[Authorize(Roles = "EMPLOYEE")]` cho API Employee.
- Dam bao SQL migration da chay tren database chung.
- Neu doi ten bang/cot, can cap nhat lai Model va AppDbContext.

Phan TV1/TV4 can goi:

- TV1 goi API `/api/manager/tasks` va `/api/manager/competency`.
- TV4 goi API `/api/employee/tasks`.
