# Cấu hình và kiểm thử TV3 Agentic AI

## 1. Hai chế độ chạy

- `RuleBased`: chạy mặc định, không cần API key. Điểm được tính bằng công thức minh bạch; Planner, Policy, Recommendation và Reflection vẫn hoạt động theo workflow.
- `HybridRuleBasedAndLLM`: Scoring Engine vẫn tự tính điểm; LLM chỉ hỗ trợ lập kế hoạch, diễn đạt khuyến nghị, Reflection và báo cáo.

Hệ thống không được hiển thị là đã dùng LLM nếu request ra model thất bại. Thuộc tính `llm.wasUsed` trong response là nguồn kiểm tra chính xác.

## 2. Luồng xử lý thật

```text
Manager
  -> HR AI Orchestrator
  -> Planner Agent
  -> Data Agent
  -> Employee/Task/Attendance/Leave Tool
  -> Analysis Agent
  -> Policy Agent -> Policy Tool -> Data/hr-policies.json
  -> Recommendation Agent
  -> Reflection Agent
  -> gọi lại Data/Policy/Recommendation Agent khi cần
  -> lưu competency_reviews nếu validation hợp lệ
  -> Report Agent
  -> Frontend Năng lực team
```

Điểm tổng chỉ được tính khi có đủ task, review chất lượng/deadline và dữ liệu chấm công trong kỳ. Khi thiếu bằng chứng, hệ thống trả về `Chưa đủ dữ liệu`, không tự gán điểm mặc định và không lưu review.

## 3. Cấu hình LLM

Không ghi API key vào source code hoặc `appsettings.json`. Cấu hình bằng biến môi trường:

```powershell
$env:AgenticAI__LLM__Enabled="true"
$env:AgenticAI__LLM__Provider="Groq"
$env:AgenticAI__LLM__BaseUrl="https://api.groq.com/openai/v1"
$env:AgenticAI__LLM__Model="openai/gpt-oss-120b"
$env:AgenticAI__LLM__ApiKey="YOUR_API_KEY"
```

Có thể dùng biến ngắn cho key:

```powershell
$env:AGENTIC_AI_LLM_API_KEY="YOUR_API_KEY"
```

Với Groq cũng có thể dùng biến chuẩn:

```powershell
$env:GROQ_API_KEY="YOUR_API_KEY"
```

Trên Render/Railway, thêm cùng các biến trên vào service backend rồi redeploy. Không đặt API key trong source code hoặc frontend.

## 4. API kiểm thử

Kiểm tra service và LLM:

```http
GET /api/manager/agentic-ai/status
```

Chạy phân tích:

```http
POST /api/manager/agentic-ai/analyze
Content-Type: application/json

{
  "managerId": 5,
  "employeeId": 8,
  "month": 7,
  "year": 2026,
  "goal": "Đánh giá năng lực và đề xuất hành động theo chính sách",
  "persistReview": true
}
```

Các trường cần kiểm tra:

- `completionStatus`: `COMPLETED`, `COMPLETED_WITH_WARNINGS` hoặc `BLOCKED_BY_VALIDATION`.
- `iterationCount`: số vòng Orchestrator và Reflection đã chạy.
- `persistedReviewIds`: ID review đã lưu vào MySQL.
- `policy.source`: nguồn policy được Policy Tool truy xuất.
- `llm.mode` và `llm.wasUsed`: hệ thống có thật sự gọi model ngoài hay không.
- `data.missingData`: dữ liệu còn thiếu, tuyệt đối không được AI tự bịa.
- `analysis.employees[].dataCompletenessPercent`: tỷ lệ bằng chứng đã thu thập.
- `analysis.employees[].isDecisionReady`: chỉ khi `true` mới được lưu review và dùng để hỗ trợ quyết định nhân sự.

## 5. Kiểm thử trên FE

1. Chạy backend tại `http://localhost:5297`.
2. Đặt `NEXT_PUBLIC_API_BASE_URL=http://localhost:5297` trong `frontend/.env.local`.
3. Chạy frontend bằng `npm run dev`.
4. Đăng nhập Manager.
5. Mở `Năng lực team`.
6. Chọn tháng và bấm `Phân tích kỳ này`.
7. Kiểm tra điểm, policy, Reflection, Agent trace và cảnh báo dữ liệu thiếu.
8. Đóng popup, bấm `Xem` để duyệt hoặc từ chối review đã lưu.

## 6. Nguyên tắc nghiệp vụ

- LLM không tự thay đổi điểm do Scoring Engine tính.
- Recommendation bắt buộc tham chiếu mã policy hợp lệ.
- Reflection chặn lưu nếu policy sai hoặc nhân viên chưa đủ task, review và chấm công.
- Manager chỉ phân tích nhân viên trong phòng ban được phân quyền.
- Admin có thể phân tích phạm vi toàn hệ thống.
- Mỗi nhân viên chỉ có một review cho một tháng/năm; chạy lại sẽ cập nhật review hiện có.
