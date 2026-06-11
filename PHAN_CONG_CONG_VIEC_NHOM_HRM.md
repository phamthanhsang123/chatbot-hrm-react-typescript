# Phan cong cong viec nhom HRM Agentic AI

## 1. Ten de tai

**XAY DUNG HE THONG QUAN TRI NHAN SU TICH HOP AGENTIC AI DANH GIA NANG LUC**

Muc tieu cua du an la xay dung he thong HRM co cac chuc nang quan ly nhan su, phong ban, chuc vu, cham cong, nghi phep, luong thuong va module **Agentic AI ho tro danh gia nang luc nhan vien**.

Huong Agentic AI cua du an:

- Manager giao task cho nhan vien trong phong ban.
- Nhan vien cap nhat tien do task.
- Manager duyet ket qua va danh gia chat luong.
- Agentic AI tong hop task, cham cong, nghi phep, deadline va review cua Manager.
- AI dua ra diem nang luc, nhan xet va de xuat hanh dong.
- Manager/HR la nguoi phe duyet ket qua cuoi cung.

---

## 2. Tai lieu chuan can doc truoc khi code

Tat ca thanh vien phai doc va lam theo cac file sau:

| File | Muc dich |
| --- | --- |
| `TAI_LIEU_LOGIC_NGHIEP_VU_HRM.md` | Logic nghiep vu HRM tong the |
| `TAI_LIEU_MODULE_DANH_GIA_NANG_LUC.md` | Logic module danh gia nang luc |
| `TAI_LIEU_MANAGER_TASK_AGENTIC_AI.md` | Luong Manager giao task va Agentic AI danh gia |
| `DO_AN_HRM_AGENTIC_AI_DOCUMENT.md` | Tai lieu tong hop do an |
| `QUY_UOC_DONG_BO_FE_BE_DATABASE_HRM.md` | Contract chung de FE, BE va Database khong bi lech |
| `TONG_HOP_DONG_BO_CHUC_NANG_HRM.md` | Bang doi chieu FE, BE, Database dang co va con thieu theo tung module |
| `TAI_LIEU_API_TV3_AGENTIC_AI.md` | API Manager Task, Employee Task va Agentic AI do TV3 phu trach |

Neu muon doi logic nghiep vu, phai cap nhat tai lieu truoc roi moi sua code.

Neu muon them field, role, status, API hoac bang database, phai cap nhat `QUY_UOC_DONG_BO_FE_BE_DATABASE_HRM.md` truoc.

---

## 3. Phan vai 4 thanh vien

| Thanh vien | Vai tro chinh | Phu trach |
| --- | --- | --- |
| TV1 | Frontend Admin + Manager | Giao dien Admin/HR, Dashboard, quan ly nhan vien, luong, nghi phep, cham cong, danh gia nang luc phia quan ly |
| TV2 | Backend + Database | API, MySQL, Auth/JWT, nhan vien, phong ban, chuc vu, cham cong, nghi phep, luong, task |
| TV3 | Agentic AI + Logic nghiep vu | Module danh gia nang luc, cong thuc tinh diem, AI nhan xet, AI de xuat hanh dong, chatbot/AI Assistant |
| TV4 | Frontend Employee + Document | Giao dien nhan vien, ho so ca nhan, cham cong ca nhan, xin nghi phep, xem luong, task ca nhan, bao cao, slide |

Noi ngan gon:

- **TV1**: lam FE cho ben Admin/Manager.
- **TV2**: lam Backend + Database.
- **TV3**: lam Agentic AI + xu ly nghiep vu danh gia nang luc.
- **TV4**: lam FE cho ben Employee + tai lieu/bao cao/slide.

---

## 4. Pham vi cong viec chi tiet

### 4.1. TV1 - Frontend Admin + Manager

TV1 phu trach cac man hinh danh cho Admin, HR va Manager.

Cong viec chinh:

- Dashboard tong quan HRM.
- Quan ly nhan vien.
- Quan ly phong ban, chuc vu neu co UI rieng.
- Quan ly luong thuong.
- Duyet nghi phep.
- Duyet cham cong.
- Man hinh Manager quan ly nhan vien trong phong ban.
- Man hinh Manager giao task cho nhan vien.
- Man hinh Manager xem tien do task.
- Man hinh Manager review task.
- Man hinh Manager xem ket qua danh gia nang luc do AI de xuat.

Nguyen tac:

- Khong tu y sua database.
- Khong tu y doi response API.
- Neu can API moi, ghi ro request/response roi gui TV2.
- Neu can logic danh gia nang luc, hoi TV3 de thong nhat.
- Giao dien phai dong nhat voi style hien tai cua project.

File/khu vuc thuong lam:

- `frontend/app/page.tsx`
- `frontend/app/components/`
- `frontend/app/services/`
- `frontend/app/admin/`
- `frontend/app/manager/`

---

### 4.2. TV2 - Backend + Database

TV2 phu trach API, MySQL, authentication va cac bang du lieu.

Cong viec chinh:

- Cau hinh ket noi MySQL.
- Auth/JWT, dang nhap, phan quyen.
- API nhan vien.
- API phong ban.
- API chuc vu.
- API cham cong.
- API nghi phep.
- API luong thuong.
- API task.
- API review task.
- API cung cap du lieu cho module danh gia nang luc.
- Tao migration/file SQL khi thay doi database.

Nguyen tac:

- Khong sua giao dien neu khong can.
- Khong hard-code du lieu mau vao API that.
- Khong push password database len GitHub.
- Moi thay doi database phai co file SQL/migration kem theo.
- API phai tra ve dung format da thong nhat voi FE.

File/khu vuc thuong lam:

- `backend/Admin/Controllers/`
- `backend/Admin/Models/`
- `backend/Admin/DTOs/`
- `backend/Admin/Services/`
- `backend/Admin/Data/AppDbContext.cs`
- `backend/Admin/Database/`

---

### 4.3. TV3 - Agentic AI + Logic nghiep vu

TV3 phu trach phan Agentic AI va logic danh gia nang luc.

Cong viec chinh:

- Xac dinh cac tieu chi danh gia nang luc.
- Xay cong thuc tinh diem.
- Xac dinh du lieu dau vao cho AI.
- Xay logic AI phan tich task, cham cong, nghi phep, deadline, review cua Manager.
- Tao nhan xet tu AI.
- Tao de xuat hanh dong:
  - Khen thuong.
  - Dao tao lai.
  - Canh bao cham tien do.
  - De xuat tang muc task.
  - De xuat Manager theo doi them.
- Dam bao AI chi de xuat, khong tu phe duyet ket qua cuoi.
- Viet tai lieu giai thich luong Agentic AI.

Du lieu dau vao cua module AI:

| Nguon du lieu | Y nghia |
| --- | --- |
| Task duoc Manager giao | Do kho, deadline, muc do uu tien |
| Tien do nhan vien cap nhat | Nhan vien dang lam den dau |
| Ket qua Manager review | Chat luong hoan thanh task |
| Cham cong | Di lam dung gio, vang mat, tre som |
| Nghi phep | Nghi co phep hay khong phep |
| Phong ban/chuc vu | Bo canh de AI nhan xet dung vai tro |

Cong thuc de xuat:

```text
Tong diem =
    Chuyen can * 20%
  + Hieu suat task * 40%
  + Ky nang/chat luong * 25%
  + Ky luat/trach nhiem * 15%
```

Nguyen tac:

- AI khong duoc tu bia KPI.
- KPI/task phai den tu Manager hoac du lieu trong he thong.
- Nhan vien cap nhat 100% khong co nghia la task da hoan thanh neu Manager chua duyet.
- Nghi phep da duoc duyet khong nen bi tinh la vi pham ky luat.
- Luong khong nen dung de tinh nang luc. Ket qua nang luc co the dung de de xuat thuong sau nay.

File/khu vuc thuong lam:

- `backend/Admin/Services/`
- `backend/Admin/Controllers/`
- `backend/Admin/DTOs/`
- `frontend/app/components/` neu co AI Assistant
- `TAI_LIEU_MODULE_DANH_GIA_NANG_LUC.md`
- `TAI_LIEU_MANAGER_TASK_AGENTIC_AI.md`

---

### 4.4. TV4 - Frontend Employee + Document

TV4 phu trach giao dien danh cho nhan vien va tai lieu bao cao.

Cong viec chinh:

- Man hinh ho so ca nhan.
- Man hinh cham cong ca nhan.
- Man hinh gui don xin nghi phep.
- Man hinh xem trang thai nghi phep.
- Man hinh xem luong.
- Man hinh xem task duoc giao.
- Man hinh cap nhat tien do task.
- Man hinh gui task de Manager duyet.
- Viet bao cao.
- Lam slide thuyet trinh.
- Chuan bi kich ban demo.

Nguyen tac:

- Khong tu y sua API/backend.
- Khong tu y doi logic AI.
- Neu can them API cho Employee, ghi request/response gui TV2.
- Tai lieu phai dung voi code thuc te, khong viet qua chuc nang chua co.

File/khu vuc thuong lam:

- `frontend/app/employee/`
- `frontend/app/components/`
- `frontend/app/services/`
- `DO_AN_HRM_AGENTIC_AI_DOCUMENT.md`
- File bao cao/slide rieng cua nhom.

---

## 5. Cach chia branch khi lam viec

Khong ai duoc push truc tiep vao `main`.

De xuat branch:

```text
main
develop
feature/tv1-admin-manager-fe
feature/tv2-backend-database
feature/tv3-agentic-ai
feature/tv4-employee-docs
```

Luong lam viec:

```text
feature/... -> develop -> main
```

Y nghia:

- `main`: ban on dinh de demo.
- `develop`: ban gom code dang phat trien.
- `feature/...`: branch rieng cua tung thanh vien.

Lenh tao branch:

```bash
git checkout -b feature/tv1-admin-manager-fe
git checkout -b feature/tv2-backend-database
git checkout -b feature/tv3-agentic-ai
git checkout -b feature/tv4-employee-docs
```

---

## 6. Quy tac Pull Request

Moi thanh vien lam xong mot phan phai tao Pull Request.

Pull Request phai ghi ro:

```text
Da lam:
- ...

File da sua:
- ...

API lien quan:
- ...

Database co thay doi khong:
- Co/Khong

Can test:
- ...
```

Chi merge khi:

- Code chay duoc.
- Khong loi build nghiem trong.
- API dung contract.
- UI khong vo layout.
- Database co file SQL/migration neu co thay doi.
- Tai lieu duoc cap nhat neu co doi logic.

---

## 7. Quy tac API contract

Truoc khi FE goi API, TV2 phai thong nhat contract.

Mau API contract:

```text
Ten chuc nang:
Method:
URL:
Role duoc goi:
Request body:
Response:
Ghi chu:
```

Vi du:

```text
Ten chuc nang: Manager tao task cho nhan vien
Method: POST
URL: /api/manager/tasks
Role duoc goi: MANAGER, ADMIN
Request body:
{
  "employeeId": 5,
  "title": "Hoan thanh bao cao thang",
  "description": "Tong hop so lieu phong ban",
  "deadline": "2026-06-20",
  "priority": "HIGH",
  "expectedScore": 100
}
Response:
{
  "taskId": 1,
  "message": "Tao task thanh cong"
}
```

---

## 8. Quy tac database

Khong sua database bang tay roi de do. Neu doi database, phai co file SQL/migration.

De xuat thu muc:

```text
backend/Admin/Database/migrations/
```

Dat ten file:

```text
001_init.sql
002_add_employee_fields.sql
003_add_task_competency.sql
```

Bang de xuat cho module Agentic AI:

```text
tasks
task_progress_logs
task_reviews
competency_reviews
```

Y nghia:

| Bang | Cong dung |
| --- | --- |
| `tasks` | Luu task Manager giao cho nhan vien |
| `task_progress_logs` | Luu lich su nhan vien cap nhat tien do |
| `task_reviews` | Luu ket qua Manager review task |
| `competency_reviews` | Luu ket qua AI danh gia nang luc |

---

## 9. Quy tac giao dien

Tat ca giao dien can dong nhat:

- Dung cung style mau sac voi HRM System hien tai.
- Khong tao layout qua khac nhau giua Admin, Manager va Employee.
- Khong dung `alert()` mac dinh cua browser.
- Thong bao nen dung popup/toast dong nhat, vi du SweetAlert2.
- So tien hien thi theo VND, vi du `15.000.000 đ`.
- Bang du lieu dai can giu layout on dinh, tranh lam giao dien bi giat.
- Form them/sua phai validate truoc khi goi API.

---

## 10. Lich lam viec de xuat 8 tuan

| Tuan | TV1 - FE Admin/Manager | TV2 - Backend/DB | TV3 - Agentic AI | TV4 - FE Employee/Docs |
| --- | --- | --- | --- | --- |
| Tuan 1 | Ra soat UI hien co, chot man hinh Admin/Manager | Ra soat DB/API hien co | Chot tieu chi AI va luong danh gia | Ra soat UI Employee va tai lieu |
| Tuan 2 | Hoan thien quan ly nhan vien, phong ban, chuc vu | API nhan vien, phong ban, chuc vu | Viet logic diem nang luc ban dau | Man hinh ho so ca nhan |
| Tuan 3 | UI luong, nghi phep, cham cong phia quan ly | API luong, nghi phep, cham cong | Ket noi du lieu cham cong/nghi phep vao AI | UI cham cong, xin nghi phep |
| Tuan 4 | UI Manager giao task | API task, progress, review | Logic task score, deadline score | UI nhan task, cap nhat tien do |
| Tuan 5 | UI Manager review task | API competency review | AI nhan xet va de xuat hanh dong | UI xem task/review |
| Tuan 6 | UI xem ket qua danh gia nang luc | API tong hop bao cao | Hoan thien Agentic AI workflow | UI xem luong, ket qua ca nhan |
| Tuan 7 | Test luong Admin/Manager | Test backend/database | Test AI voi cac tinh huong demo | Viet bao cao, slide, demo script |
| Tuan 8 | Sua loi UI, chuan bi demo | Sua loi API/DB | Giai thich AI, chuan bi phan thuyet trinh | Hoan thien tai lieu, slide |

---

## 11. Luong tich hop chuc nang

Luong task va AI danh gia nang luc:

```text
Manager tao task
-> Employee nhan task
-> Employee cap nhat tien do
-> Employee gui hoan thanh
-> Manager review task
-> AI tong hop du lieu
-> AI tinh diem va nhan xet
-> Manager/HR phe duyet ket qua
```

Lien ket voi cac module HRM:

| Module | Lien ket voi danh gia nang luc |
| --- | --- |
| Nhan vien | Biet ai duoc danh gia, thuoc phong ban nao |
| Phong ban | Manager chi quan ly nhan vien trong phong ban |
| Chuc vu | AI nhan xet theo vai tro cong viec |
| Cham cong | Tinh diem chuyen can |
| Nghi phep | Phan biet nghi co phep/khong phep |
| Task | Tinh hieu suat va deadline |
| Review Manager | Tinh chat luong va ky nang |
| Luong thuong | Co the dung ket qua nang luc de de xuat thuong |

---

## 12. Definition of Done

Mot chuc nang chi duoc xem la xong khi:

- Co UI neu la chuc nang nguoi dung thao tac.
- Co API neu can backend.
- Co database neu can luu du lieu.
- Co validate du lieu dau vao.
- Co thong bao thanh cong/that bai.
- Reload lai van con du lieu moi.
- Khong lam hong chuc nang khac.
- Co ghi chu trong tai lieu neu thay doi logic nghiep vu.

---

## 13. Cac loi can tranh

- Moi nguoi tu them logic rieng lam he thong khong thong nhat.
- FE tu fake data trong khi backend da co API.
- Backend doi ten field khien FE bi loi.
- Sua database nhung khong co file SQL.
- Push password MySQL len GitHub.
- Doi giao dien qua khac style chung.
- AI tu bia KPI khong co du lieu that.
- Nhan vien tu danh gia minh ma Manager khong duyet.
- Luong bi dung sai de tinh nang luc.

---

## 14. Ket luan

Nhom can lam theo nguyen tac:

```text
Tai lieu chuan -> API contract -> Database migration -> Code -> Test -> Pull Request -> Merge
```

Neu lam dung quy trinh nay, 4 thanh vien co the phat trien rieng nhung van dam bao logic, giao dien va database khop nhau khi merge vao project chung.
