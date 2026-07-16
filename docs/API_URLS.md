# URL truy cap va API du an HRM AI

Tai lieu nay dung de cac thanh vien khac clone/pull code ve co the biet cach mo giao dien, Swagger va goi API theo tung chuc nang.

## 1. URL chay local

| Muc dich | URL |
|---|---|
| Frontend HRM | http://localhost:3000 |
| Backend API root | http://localhost:5297 |
| Swagger test API | http://localhost:5297/swagger |
| Backend API public Railway | https://api-production-ffaa0.up.railway.app |
| Swagger public Railway | https://api-production-ffaa0.up.railway.app/swagger |

## 2. Lenh chay du an

### Backend

```powershell
cd backend/Admin
dotnet run
```

Backend mac dinh chay o:

```text
http://localhost:5297
```

Backend da deploy public tren Railway:

```text
https://api-production-ffaa0.up.railway.app
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend mac dinh chay o:

```text
http://localhost:3000
```

## 3. URL man hinh frontend

Ung dung hien tai dung mot man hinh chinh `http://localhost:3000`, sau do nguoi dung dang nhap va chon menu trong sidebar.

| Chuc nang | Cach truy cap |
|---|---|
| Dang nhap | http://localhost:3000 |
| Dashboard Admin/HR | Dang nhap Admin -> menu Dashboard |
| Quan ly nhan vien | Dang nhap Admin -> menu Nhan vien |
| Luong thuong | Dang nhap Admin -> menu Luong thuong |
| Nghi phep | Dang nhap Admin -> menu Nghi phep |
| Duyet cham cong | Dang nhap Admin -> menu Duyet cham cong |
| Danh gia nang luc | Dang nhap Admin -> menu Danh gia nang luc |
| AI Assistant | Dang nhap Admin -> menu AI Assistant |
| Bao cao | Dang nhap Admin -> menu Bao cao |
| Phan tich | Dang nhap Admin -> menu Phan tich |
| Employee Portal | Dang nhap bang vai tro Nhan vien |

## 4. API Auth

Base URL:

```text
http://localhost:5297
```

Neu dung API public Railway, thay base URL bang:

```text
https://api-production-ffaa0.up.railway.app
```

| Chuc nang | Method | Endpoint |
|---|---:|---|
| Dang nhap | POST | `/api/admin/auth/login` |
| Quen mat khau | POST | `/api/admin/auth/forgot-password` |

## 5. API Nhan vien, phong ban, chuc vu

| Chuc nang | Method | Endpoint |
|---|---:|---|
| Lay danh sach nhan vien | GET | `/api/admin/employees` |
| Lay chi tiet nhan vien | GET | `/api/admin/employees/{id}` |
| Lay danh sach phong ban | GET | `/api/admin/employees/departments` |
| Lay danh sach chuc vu | GET | `/api/admin/employees/positions` |
| Them nhan vien | POST | `/api/admin/employees` |
| Cap nhat nhan vien | PUT | `/api/admin/employees/{id}` |
| Cho nhan vien nghi viec | DELETE | `/api/admin/employees/{id}` |

Vi du:

```text
GET http://localhost:5297/api/admin/employees
GET http://localhost:5297/api/admin/employees/departments
```

## 6. API Nghi phep

| Chuc nang | Method | Endpoint |
|---|---:|---|
| Lay danh sach don nghi phep | GET | `/api/admin/leave-requests` |
| Loc don theo trang thai | GET | `/api/admin/leave-requests?status=Cho%20duyet` |
| Tao don nghi phep | POST | `/api/admin/leave-requests` |
| Duyet don nghi phep | POST | `/api/admin/leave-requests/{id}/approve` |
| Tu choi don nghi phep | POST | `/api/admin/leave-requests/{id}/reject` |
| Dashboard nghi phep | GET | `/api/admin/leave-requests/dashboard` |

Vi du body tao don:

```json
{
  "employeeId": 1,
  "leaveTypeId": 1,
  "startDate": "20/01/2026",
  "endDate": "21/01/2026",
  "reason": "Nghi viec gia dinh"
}
```

## 7. API Cham cong

| Chuc nang | Method | Endpoint |
|---|---:|---|
| Check-in nhan vien | POST | `/api/admin/attendance/checkin/{empId}` |
| Check-out nhan vien | POST | `/api/admin/attendance/checkout/{empId}` |
| Lay cham cong theo ngay | GET | `/api/admin/attendance?date=2026-01-16` |
| Tong hop cham cong theo ngay | GET | `/api/admin/attendance/summary?date=2026-01-16` |
| Bao cao cham cong theo thang | GET | `/api/admin/attendance/report?year=2026&month=1` |
| Lay don bo sung/dieu chinh cham cong | GET | `/api/admin/attendance/requests` |
| Duyet don cham cong | POST | `/api/admin/attendance/requests/{id}/approve` |
| Tu choi don cham cong | POST | `/api/admin/attendance/requests/{id}/reject` |

Vi du:

```text
GET http://localhost:5297/api/admin/attendance?date=2026-01-16
GET http://localhost:5297/api/admin/attendance/requests
```

## 8. API Luong

| Chuc nang | Method | Endpoint |
|---|---:|---|
| Dashboard luong | GET | `/api/admin/salary/dashboard?month=1&year=2026` |
| Lay bang luong | GET | `/api/admin/salary?month=1&year=2026` |
| Loc bang luong theo trang thai | GET | `/api/admin/salary?month=1&year=2026&status=Cho%20duyet` |
| Tinh luong thang | POST | `/api/admin/salary/calculate?month=1&year=2026` |
| Duyet luong | POST | `/api/admin/salary/{id}/approve` |
| Thanh toan luong | POST | `/api/admin/salary/{id}/pay` |

Vi du:

```text
GET http://localhost:5297/api/admin/salary?month=1&year=2026
POST http://localhost:5297/api/admin/salary/calculate?month=1&year=2026
```

## 9. API Danh gia nang luc Agentic AI

| Chuc nang | Method | Endpoint |
|---|---:|---|
| Lay danh sach danh gia | GET | `/api/admin/competency?month=1&year=2026` |
| Dashboard danh gia nang luc | GET | `/api/admin/competency/dashboard?month=1&year=2026` |
| Phan tich chi tiet nhan vien | GET | `/api/admin/competency/{employeeId}/analyze?month=1&year=2026` |

Vi du:

```text
GET http://localhost:5297/api/admin/competency
GET http://localhost:5297/api/admin/competency/1/analyze
```

## 10. API Manager Task

| Chuc nang | Method | Endpoint |
|---|---:|---|
| Manager lay danh sach task | GET | `/api/manager/tasks` |
| Manager lay chi tiet task | GET | `/api/manager/tasks/{id}` |
| Manager tao task | POST | `/api/manager/tasks` |
| Manager cap nhat task | PUT | `/api/manager/tasks/{id}` |
| Manager review task | POST | `/api/manager/tasks/{id}/review` |

## 11. API Employee Task

| Chuc nang | Method | Endpoint |
|---|---:|---|
| Nhan vien lay task cua minh | GET | `/api/employee/tasks` |
| Nhan vien cap nhat tien do | PUT | `/api/employee/tasks/{id}/progress` |
| Nhan vien nop task | POST | `/api/employee/tasks/{id}/submit` |

## 12. API Manager Competency

| Chuc nang | Method | Endpoint |
|---|---:|---|
| Manager xem danh gia nang luc | GET | `/api/manager/competency` |
| Lay du lieu dau vao cua nhan vien | GET | `/api/manager/competency/{employeeId}/input-data` |
| Tao danh gia nang luc | POST | `/api/manager/competency/{employeeId}/generate` |
| Duyet review nang luc | POST | `/api/manager/competency/{reviewId}/approve` |
| Tu choi review nang luc | POST | `/api/manager/competency/{reviewId}/reject` |

## 13. Ghi chu cho thanh vien khac

- Nen xem Swagger truoc khi code frontend: `http://localhost:5297/swagger`.
- Frontend lay API base tu bien moi truong `NEXT_PUBLIC_API_BASE_URL`, mac dinh la `http://localhost:5297`.
- Khong push mat khau database that len GitHub. Neu can doi database, dung bien moi truong hoac file cau hinh local rieng.
- Cac endpoint co fallback demo de giao dien van co du lieu khi database rong hoac chua dong bo schema.
