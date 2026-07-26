using Admin.DTOs;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Admin.Services.Agentic
{
    public record AgenticLlmResult<T>(T Value, bool Used, string Message);

    public class AgenticLlmService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;
        private readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        public AgenticLlmService(HttpClient httpClient, IConfiguration config)
        {
            _httpClient = httpClient;
            _config = config;
            _httpClient.Timeout = TimeSpan.FromSeconds(GetInt("AgenticAI:LLM:TimeoutSeconds", 30));
        }

        public AgenticLlmStatusDto GetStatus()
        {
            var enabled = GetBool("AgenticAI:LLM:Enabled");
            var apiKey = GetApiKey();
            var status = new AgenticLlmStatusDto
            {
                IsEnabled = enabled,
                IsConfigured = !string.IsNullOrWhiteSpace(apiKey) && !string.IsNullOrWhiteSpace(GetBaseUrl()),
                Provider = GetValue("AgenticAI:LLM:Provider", "Groq"),
                Model = GetValue("AgenticAI:LLM:Model", "openai/gpt-oss-120b"),
                Mode = enabled ? "HybridRuleBasedAndLLM" : "RuleBased"
            };

            if (!enabled)
                status.Notes.Add("LLM is disabled. Agentic AI is using the deterministic and auditable scoring workflow.");
            else if (!status.IsConfigured)
                status.Notes.Add("LLM is enabled but missing BaseUrl or ApiKey. Falling back to rule-based logic.");
            else
                status.Notes.Add("LLM is configured. Planner, recommendation, reflection and report can be enhanced dynamically.");

            return status;
        }

        public async Task<AgenticLlmResult<AgenticPlanDto>> EnhancePlanAsync(
            AgenticAiRunRequestDto request,
            AgenticPlanDto fallback)
        {
            var system = """
                You are the Planner Agent in an HRM Agentic AI system.
                Return only valid JSON matching this shape:
                {
                  "intent": string,
                  "requiredData": string[],
                  "requiredTools": string[],
                  "successCriteria": string[],
                  "steps": [{"order": number, "agent": string, "action": string, "reason": string}]
                }
                Keep the workflow factual, HR-oriented and tool-driven. Do not invent database data.
                Write all user-facing intent, action and reason text in Vietnamese.
                """;

            var payload = new
            {
                request,
                currentPlan = fallback,
                instruction = "Improve the plan based on the manager goal. Keep DataAgent, AnalysisAgent, PolicyAgent, RecommendationAgent, ReflectionAgent and ReportAgent."
            };

            return await CompleteJsonAsync(system, payload, fallback, ValidatePlan);
        }

        public async Task<AgenticLlmResult<AgenticToolIntentDto>> ParseDataQueryIntentAsync(
            string question,
            AgenticToolIntentDto fallback)
        {
            var system = """
                You are the intent router of an HRM Agentic AI system.
                You never access databases and never generate SQL.
                Return only valid JSON matching:
                {
                  "isSupported": boolean,
                  "tool": string,
                  "metric": string,
                  "employeeName": string,
                  "employeeNames": string[]
                }
                Allowed operations:
                1. tool = "AttendanceTool", metric = "late_days"
                   for questions asking how many days an employee was late.
                2. tool = "AttendanceTool", metric = "attendance_summary"
                   for questions asking total working hours, attendance days, overtime,
                   incomplete attendance or early leave in a selected period.
                3. tool = "LeaveTool", metric = "leave_summary"
                   for questions asking leave days, leave requests or approval status.
                4. tool = "AttendanceLeaveTool", metric = "attendance_leave_summary"
                   for compound questions asking both attendance/working hours and leave.
                5. tool = "SalaryTool", metric = "total_salary_history"
                   for questions asking total historical salary, received salary,
                   or salary across all months of one employee.
                6. tool = "SalaryTool", metric = "salary_period"
                   for questions asking salary in the selected month/current month.
                7. tool = "TaskTool", metric = "task_summary"
                   for questions asking task counts, completed tasks, overdue tasks,
                   progress or task performance of one employee in a period.
                Extract every employee full name exactly from the question into employeeNames.
                Keep employeeName equal to the first extracted employee for backward compatibility.
                For every other request set isSupported=false.
                """;

            return await CompleteJsonAsync(
                system,
                new
                {
                    question,
                    allowedTools = new[]
                    {
                        "AttendanceTool:late_days",
                        "AttendanceTool:attendance_summary",
                        "LeaveTool:leave_summary",
                        "AttendanceLeaveTool:attendance_leave_summary",
                        "SalaryTool:total_salary_history",
                        "SalaryTool:salary_period",
                        "TaskTool:task_summary"
                    }
                },
                fallback,
                candidate => candidate.IsSupported == fallback.IsSupported
                    && (
                        !candidate.IsSupported
                        || (
                            IsAllowedDataQueryIntent(candidate)
                            && string.Equals(candidate.Tool, fallback.Tool, StringComparison.OrdinalIgnoreCase)
                            && string.Equals(candidate.Metric, fallback.Metric, StringComparison.OrdinalIgnoreCase)
                            && (
                                (candidate.EmployeeNames?.Count ?? 0) > 0
                                || !string.IsNullOrWhiteSpace(candidate.EmployeeName)
                            )
                        )
                    )
            );
        }

        public async Task<AgenticLlmResult<AgenticGroundedAnswerDto>> ComposeGroundedAnswerAsync(
            string question,
            string tool,
            object evidence,
            AgenticGroundedAnswerDto fallback)
        {
            var system = """
                You are the Response Agent of an HRM Agentic AI system.
                Write a concise, natural Vietnamese answer for a manager using only the supplied tool evidence.
                Do not invent, estimate, omit the payment status distinction, or change any number.
                Mention the employee, result, period/scope, and the most useful supporting details.
                If data is pending, clearly distinguish it from paid/confirmed data.
                Return only valid JSON:
                {
                  "answer": string,
                  "employeeId": number,
                  "employeeIds": number[],
                  "tool": string,
                  "primaryValue": number,
                  "secondaryValue": number,
                  "recordCount": number
                }
                Copy employeeId, employeeIds, tool, primaryValue, secondaryValue and recordCount exactly
                from verifiedFacts. Those fields are validation seals and must never be recalculated.
                When evidence contains multiple employees, answer every employee named in the question,
                compare their values when useful, and state the combined total only when the evidence supports it.
                """;

            var payload = new
            {
                question,
                tool,
                evidence,
                verifiedFacts = new
                {
                    fallback.EmployeeId,
                    fallback.EmployeeIds,
                    fallback.Tool,
                    fallback.PrimaryValue,
                    fallback.SecondaryValue,
                    fallback.RecordCount
                },
                fallbackAnswer = fallback.Answer
            };

            return await CompleteJsonAsync(
                system,
                payload,
                fallback,
                candidate =>
                    !string.IsNullOrWhiteSpace(candidate.Answer)
                    && candidate.EmployeeId == fallback.EmployeeId
                    && (candidate.EmployeeIds ?? new List<int>()).SequenceEqual(fallback.EmployeeIds)
                    && string.Equals(candidate.Tool, fallback.Tool, StringComparison.OrdinalIgnoreCase)
                    && candidate.PrimaryValue == fallback.PrimaryValue
                    && candidate.SecondaryValue == fallback.SecondaryValue
                    && candidate.RecordCount == fallback.RecordCount
            );
        }

        private static bool IsAllowedDataQueryIntent(AgenticToolIntentDto candidate)
        {
            return (
                    string.Equals(candidate.Tool, "AttendanceTool", StringComparison.OrdinalIgnoreCase)
                    && string.Equals(candidate.Metric, "late_days", StringComparison.OrdinalIgnoreCase)
                )
                || (
                    string.Equals(candidate.Tool, "AttendanceTool", StringComparison.OrdinalIgnoreCase)
                    && string.Equals(candidate.Metric, "attendance_summary", StringComparison.OrdinalIgnoreCase)
                )
                || (
                    string.Equals(candidate.Tool, "LeaveTool", StringComparison.OrdinalIgnoreCase)
                    && string.Equals(candidate.Metric, "leave_summary", StringComparison.OrdinalIgnoreCase)
                )
                || (
                    string.Equals(candidate.Tool, "AttendanceLeaveTool", StringComparison.OrdinalIgnoreCase)
                    && string.Equals(candidate.Metric, "attendance_leave_summary", StringComparison.OrdinalIgnoreCase)
                )
                || (
                    string.Equals(candidate.Tool, "SalaryTool", StringComparison.OrdinalIgnoreCase)
                    && string.Equals(candidate.Metric, "total_salary_history", StringComparison.OrdinalIgnoreCase)
                )
                || (
                    string.Equals(candidate.Tool, "SalaryTool", StringComparison.OrdinalIgnoreCase)
                    && string.Equals(candidate.Metric, "salary_period", StringComparison.OrdinalIgnoreCase)
                )
                || (
                    string.Equals(candidate.Tool, "TaskTool", StringComparison.OrdinalIgnoreCase)
                    && string.Equals(candidate.Metric, "task_summary", StringComparison.OrdinalIgnoreCase)
                );
        }

        public async Task<AgenticLlmResult<AgenticRecommendationPackageDto>> EnhanceRecommendationAsync(
            AgenticAnalysisDto analysis,
            AgenticPolicyContextDto policy,
            AgenticRecommendationPackageDto fallback)
        {
            var system = """
                You are the Recommendation Agent in an HRM Agentic AI system.
                Return only valid JSON matching this shape:
                {
                  "overallRecommendation": string,
                  "items": [{
                    "employeeId": number,
                    "employeeName": string,
                    "action": string,
                    "priority": string,
                    "reason": string,
                    "evidence": string,
                    "policyReference": string
                  }]
                }
                Recommendations must be explainable, fair, based on provided scores, and reference policy codes.
                Do not change employeeId, employeeName, total score evidence, or policy references unless clearly inconsistent.
                Write all user-facing action, reason and evidence text in Vietnamese.
                """;

            var payload = new
            {
                analysis,
                policy,
                currentRecommendation = fallback,
                instruction = "Rewrite recommendations to sound like a professional HR manager decision support note."
            };

            return await CompleteJsonAsync(
                system,
                payload,
                fallback,
                candidate => ValidateRecommendation(candidate, fallback)
            );
        }

        public async Task<AgenticLlmResult<AgenticReflectionDto>> EnhanceReflectionAsync(
            AgenticDataPackageDto data,
            AgenticAnalysisDto analysis,
            AgenticPolicyContextDto policy,
            AgenticRecommendationPackageDto recommendation,
            AgenticReflectionDto fallback)
        {
            var system = """
                You are the Reflection / Validation Agent in an HRM Agentic AI system.
                Return only valid JSON matching this shape:
                {
                  "isValid": boolean,
                  "validationStatus": string,
                  "needsMoreData": boolean,
                  "needsPolicyReview": boolean,
                  "needsRecommendationRevision": boolean,
                  "checks": string[],
                  "issues": string[],
                  "nextActions": string[]
                }
                Validate data sufficiency, score range, policy alignment and recommendation quality.
                If important data is missing but the report can still be shown, use validationStatus = "VALID_WITH_WARNINGS".
                Write checks, issues and nextActions in Vietnamese.
                """;

            var payload = new
            {
                missingData = data.MissingData,
                analysis,
                policy,
                recommendation,
                currentReflection = fallback
            };

            return await CompleteJsonAsync(
                system,
                payload,
                fallback,
                candidate => ValidateReflection(candidate, fallback)
            );
        }

        public async Task<AgenticLlmResult<AgenticReportDto>> EnhanceReportAsync(
            AgenticAiRunRequestDto request,
            AgenticAnalysisDto analysis,
            AgenticRecommendationPackageDto recommendation,
            AgenticReflectionDto reflection,
            AgenticReportDto fallback)
        {
            var system = """
                You are the Report Agent in an HRM Agentic AI system.
                Return only valid JSON matching this shape:
                {
                  "title": string,
                  "summary": string,
                  "dashboardMetrics": {"key": number},
                  "highlights": string[],
                  "warnings": string[],
                  "generatedAt": string,
                  "exportStatus": string
                }
                Keep dashboardMetrics numeric and preserve the provided metric keys.
                Use concise Vietnamese manager-facing wording.
                """;

            var payload = new
            {
                request,
                analysis,
                recommendation,
                reflection,
                currentReport = fallback
            };

            return await CompleteJsonAsync(
                system,
                payload,
                fallback,
                candidate => ValidateReport(candidate, fallback)
            );
        }

        private async Task<AgenticLlmResult<T>> CompleteJsonAsync<T>(
            string systemPrompt,
            object userPayload,
            T fallback,
            Func<T, bool>? validator = null)
        {
            var status = GetStatus();
            if (!status.IsEnabled)
                return new AgenticLlmResult<T>(fallback, false, "LLM disabled.");

            if (!status.IsConfigured)
                return new AgenticLlmResult<T>(fallback, false, "LLM not configured.");

            try
            {
                var endpoint = $"{GetBaseUrl().TrimEnd('/')}/chat/completions";

                var body = new
                {
                    model = status.Model,
                    temperature = 0.2,
                    response_format = new { type = "json_object" },
                    messages = new[]
                    {
                        new { role = "system", content = systemPrompt },
                        new { role = "user", content = JsonSerializer.Serialize(userPayload, _jsonOptions) }
                    }
                };

                using var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
                using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
                {
                    Content = content
                };
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", GetApiKey());

                using var response = await _httpClient.SendAsync(request);
                var responseText = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    var message = (int)response.StatusCode == 429
                        ? $"{status.Provider} đang hết quota hoặc vượt giới hạn request (429)."
                        : $"{status.Provider} request failed: {(int)response.StatusCode}.";
                    return new AgenticLlmResult<T>(fallback, false, message);
                }

                var chatResponse = JsonSerializer.Deserialize<ChatCompletionResponse>(responseText, _jsonOptions);
                var json = chatResponse?.Choices?.FirstOrDefault()?.Message?.Content;

                if (string.IsNullOrWhiteSpace(json))
                    return new AgenticLlmResult<T>(fallback, false, "LLM returned empty content.");

                var parsed = JsonSerializer.Deserialize<T>(ExtractJsonObject(json), _jsonOptions);
                if (parsed == null)
                    return new AgenticLlmResult<T>(fallback, false, "LLM JSON parse returned null.");

                if (validator != null && !validator(parsed))
                    return new AgenticLlmResult<T>(fallback, false, "LLM output did not pass validation.");

                return new AgenticLlmResult<T>(parsed, true, "LLM enhancement applied.");
            }
            catch (Exception ex)
            {
                return new AgenticLlmResult<T>(fallback, false, $"LLM fallback: {ex.Message}");
            }
        }

        private static bool ValidatePlan(AgenticPlanDto plan)
        {
            return !string.IsNullOrWhiteSpace(plan.Intent)
                && plan.RequiredData.Count > 0
                && plan.RequiredTools.Count > 0
                && plan.Steps.Count > 0;
        }

        private static bool ValidateRecommendation(
            AgenticRecommendationPackageDto candidate,
            AgenticRecommendationPackageDto fallback)
        {
            if (candidate.Items.Count != fallback.Items.Count)
                return false;

            var expected = fallback.Items.ToDictionary(item => item.EmployeeId);
            return candidate.Items.All(item =>
                expected.TryGetValue(item.EmployeeId, out var deterministic)
                && string.Equals(
                    item.PolicyReference,
                    deterministic.PolicyReference,
                    StringComparison.OrdinalIgnoreCase
                )
                && !string.IsNullOrWhiteSpace(item.Action)
                && !string.IsNullOrWhiteSpace(item.Reason)
                && !string.IsNullOrWhiteSpace(item.Evidence)
            );
        }

        private static bool ValidateReflection(
            AgenticReflectionDto candidate,
            AgenticReflectionDto fallback)
        {
            return !string.IsNullOrWhiteSpace(candidate.ValidationStatus)
                && candidate.IsValid == fallback.IsValid
                && candidate.NeedsMoreData == fallback.NeedsMoreData
                && candidate.NeedsPolicyReview == fallback.NeedsPolicyReview
                && candidate.NeedsRecommendationRevision == fallback.NeedsRecommendationRevision
                && string.Equals(
                    candidate.ValidationStatus,
                    fallback.ValidationStatus,
                    StringComparison.OrdinalIgnoreCase
                );
        }

        private static bool ValidateReport(
            AgenticReportDto candidate,
            AgenticReportDto fallback)
        {
            if (string.IsNullOrWhiteSpace(candidate.Summary)
                || candidate.DashboardMetrics.Count != fallback.DashboardMetrics.Count)
            {
                return false;
            }

            return fallback.DashboardMetrics.All(metric =>
                candidate.DashboardMetrics.TryGetValue(metric.Key, out var value)
                && value == metric.Value
            );
        }

        private bool GetBool(string key)
        {
            var value = GetValue(key, "false");
            return bool.TryParse(value, out var parsed) && parsed;
        }

        private int GetInt(string key, int fallback)
        {
            var value = GetValue(key, fallback.ToString());
            return int.TryParse(value, out var parsed) ? parsed : fallback;
        }

        private string GetBaseUrl()
        {
            return GetValue("AgenticAI:LLM:BaseUrl", "https://api.groq.com/openai/v1");
        }

        private string GetApiKey()
        {
            var configured = _config["AgenticAI:LLM:ApiKey"];
            if (!string.IsNullOrWhiteSpace(configured))
                return configured;

            return Environment.GetEnvironmentVariable("AgenticAI__LLM__ApiKey")
                ?? Environment.GetEnvironmentVariable("AGENTIC_AI_LLM_API_KEY")
                ?? Environment.GetEnvironmentVariable("GROQ_API_KEY")
                ?? "";
        }

        private string GetValue(string key, string fallback)
        {
            return _config[key]
                ?? Environment.GetEnvironmentVariable(key.Replace(":", "__"))
                ?? Environment.GetEnvironmentVariable(key.Replace(':', '_'))
                ?? fallback;
        }

        private static string ExtractJsonObject(string content)
        {
            var trimmed = content.Trim();
            if (trimmed.StartsWith("```"))
            {
                trimmed = trimmed
                    .Replace("```json", "", StringComparison.OrdinalIgnoreCase)
                    .Replace("```", "")
                    .Trim();
            }

            var start = trimmed.IndexOf('{');
            var end = trimmed.LastIndexOf('}');
            return start >= 0 && end > start
                ? trimmed[start..(end + 1)]
                : trimmed;
        }

        private class ChatCompletionResponse
        {
            public List<ChatChoice> Choices { get; set; } = new();
        }

        private class ChatChoice
        {
            public ChatMessage Message { get; set; } = new();
        }

        private class ChatMessage
        {
            public string Content { get; set; } = "";
        }
    }
}
