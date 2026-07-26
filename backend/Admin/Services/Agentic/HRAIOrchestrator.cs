using Admin.DTOs;

namespace Admin.Services.Agentic
{
    public class HRAIOrchestrator
    {
        private const int MaxReflectionIterations = 2;

        private readonly PlannerAgent _planner;
        private readonly DataAgent _dataAgent;
        private readonly AnalysisAgent _analysisAgent;
        private readonly PolicyAgent _policyAgent;
        private readonly RecommendationAgent _recommendationAgent;
        private readonly ReflectionAgent _reflectionAgent;
        private readonly ReportAgent _reportAgent;
        private readonly AgenticLlmService _llmService;
        private readonly AgenticCompetencyService _competencyService;

        public HRAIOrchestrator(
            PlannerAgent planner,
            DataAgent dataAgent,
            AnalysisAgent analysisAgent,
            PolicyAgent policyAgent,
            RecommendationAgent recommendationAgent,
            ReflectionAgent reflectionAgent,
            ReportAgent reportAgent,
            AgenticLlmService llmService,
            AgenticCompetencyService competencyService)
        {
            _planner = planner;
            _dataAgent = dataAgent;
            _analysisAgent = analysisAgent;
            _policyAgent = policyAgent;
            _recommendationAgent = recommendationAgent;
            _reflectionAgent = reflectionAgent;
            _reportAgent = reportAgent;
            _llmService = llmService;
            _competencyService = competencyService;
        }

        public async Task<AgenticAiWorkflowDto> RunAsync(AgenticAiRunRequestDto request)
        {
            NormalizeRequest(request);

            var workflow = new AgenticAiWorkflowDto
            {
                RunId = Guid.NewGuid().ToString("N"),
                CreatedAt = DateTime.Now,
                Goal = request.Goal,
                ManagerId = request.ManagerId,
                EmployeeId = request.EmployeeId,
                DepartmentId = request.DepartmentId,
                Month = request.Month,
                Year = request.Year,
                IterationCount = 1,
                Llm = _llmService.GetStatus()
            };

            workflow.Plan = _planner.CreatePlan(request);
            Trace(workflow, "HR AI Orchestrator", "Planning", "Planner created required data, tools and agent steps.");
            var enhancedPlan = await _llmService.EnhancePlanAsync(request, workflow.Plan);
            workflow.Plan = enhancedPlan.Value;
            ApplyLlmResult(workflow, "PlannerAgent", enhancedPlan.Used, enhancedPlan.Message);

            workflow.Data = await _dataAgent.CollectAsync(request);
            Trace(workflow, "DataAgent", "Collect HRM data", $"Collected {workflow.Data.CompetencyInputs.Count} competency input package(s).");

            workflow.Analysis = _analysisAgent.Analyze(workflow.Data);
            Trace(workflow, "AnalysisAgent", "Analyze performance", $"Analyzed {workflow.Analysis.TotalEmployees} employee(s).");

            workflow.Policy = await _policyAgent.LoadPolicyAsync(request);
            Trace(workflow, "PolicyAgent", "Load policy", $"Loaded {workflow.Policy.Rules.Count} policy rule(s).");

            workflow.Recommendation = _recommendationAgent.Recommend(workflow.Analysis, workflow.Policy);
            Trace(workflow, "RecommendationAgent", "Generate actions", $"Generated {workflow.Recommendation.Items.Count} recommendation(s).");
            var enhancedRecommendation = await _llmService.EnhanceRecommendationAsync(
                workflow.Analysis,
                workflow.Policy,
                workflow.Recommendation
            );
            workflow.Recommendation = enhancedRecommendation.Value;
            ApplyLlmResult(workflow, "RecommendationAgent", enhancedRecommendation.Used, enhancedRecommendation.Message);

            workflow.Reflection = _reflectionAgent.Validate(
                workflow.Data,
                workflow.Analysis,
                workflow.Policy,
                workflow.Recommendation
            );
            Trace(workflow, "ReflectionAgent", "Validate workflow", workflow.Reflection.IsValid ? "Validation passed." : "Validation found issues.");
            var enhancedReflection = await _llmService.EnhanceReflectionAsync(
                workflow.Data,
                workflow.Analysis,
                workflow.Policy,
                workflow.Recommendation,
                workflow.Reflection
            );
            workflow.Reflection = enhancedReflection.Value;
            ApplyLlmResult(workflow, "ReflectionAgent", enhancedReflection.Used, enhancedReflection.Message);

            await RunReflectionLoopAsync(request, workflow);

            if (request.PersistReview && workflow.Reflection.IsValid)
            {
                foreach (var input in workflow.Data.CompetencyInputs)
                {
                    if (input.TotalTasks == 0 && input.AttendanceDays == 0)
                    {
                        Trace(
                            workflow,
                            "HR AI Orchestrator",
                            "Skip insufficient employee",
                            $"{input.EmployeeName} was not persisted because both task and attendance evidence are missing."
                        );
                        continue;
                    }

                    var analysis = workflow.Analysis.Employees
                        .FirstOrDefault(item => item.EmployeeId == input.EmployeeId);
                    if (analysis == null)
                        continue;
                    if (!analysis.IsDecisionReady)
                    {
                        Trace(
                            workflow,
                            "HR AI Orchestrator",
                            "Skip low-confidence review",
                            $"{input.EmployeeName} was not persisted because required task, review or attendance evidence is missing."
                        );
                        continue;
                    }

                    var recommendation = workflow.Recommendation.Items
                        .FirstOrDefault(item => item.EmployeeId == input.EmployeeId);
                    var saved = await _competencyService.PersistWorkflowReview(
                        request.ManagerId,
                        input,
                        analysis,
                        recommendation
                    );
                    workflow.PersistedReviewIds.Add(saved.Id);
                }

                Trace(workflow, "HR AI Orchestrator", "Persist review", "Saved generated competency review(s) to HRM database.");
            }
            else if (request.PersistReview)
            {
                Trace(workflow, "HR AI Orchestrator", "Skip persistence", "Review was not saved because validation failed.");
            }

            workflow.Report = _reportAgent.BuildReport(request, workflow.Analysis, workflow.Recommendation, workflow.Reflection);
            var enhancedReport = await _llmService.EnhanceReportAsync(
                request,
                workflow.Analysis,
                workflow.Recommendation,
                workflow.Reflection,
                workflow.Report
            );
            workflow.Report = enhancedReport.Value;
            ApplyLlmResult(workflow, "ReportAgent", enhancedReport.Used, enhancedReport.Message);
            Trace(workflow, "ReportAgent", "Build report", "Generated dashboard-ready JSON report.");
            workflow.CompletionStatus = workflow.Reflection.IsValid
                ? workflow.Reflection.NeedsMoreData || workflow.Reflection.Issues.Count > 0
                    ? "COMPLETED_WITH_WARNINGS"
                    : "COMPLETED"
                : "BLOCKED_BY_VALIDATION";

            return workflow;
        }

        private async Task RunReflectionLoopAsync(
            AgenticAiRunRequestDto request,
            AgenticAiWorkflowDto workflow)
        {
            for (var iteration = 2; iteration <= MaxReflectionIterations; iteration++)
            {
                if (!workflow.Reflection.NeedsMoreData
                    && !workflow.Reflection.NeedsPolicyReview
                    && !workflow.Reflection.NeedsRecommendationRevision)
                {
                    return;
                }

                workflow.IterationCount = iteration;
                var stateChanged = false;

                if (workflow.Reflection.NeedsMoreData)
                {
                    var previousFingerprint = CreateDataFingerprint(workflow.Data);
                    var refreshedData = await _dataAgent.CollectAsync(request);
                    var refreshedFingerprint = CreateDataFingerprint(refreshedData);

                    if (!string.Equals(previousFingerprint, refreshedFingerprint, StringComparison.Ordinal))
                    {
                        workflow.Data = refreshedData;
                        workflow.Analysis = _analysisAgent.Analyze(workflow.Data);
                        stateChanged = true;
                        Trace(workflow, "DataAgent", $"Reflection retry {iteration}", "Collected updated HRM data after validation requested more data.");
                    }
                    else
                    {
                        workflow.Data.ContextNotes.Add("Reflection đã gọi lại DataAgent nhưng nguồn dữ liệu hiện tại chưa có dữ liệu mới.");
                        Trace(workflow, "DataAgent", $"Reflection retry {iteration}", "No new data was available; stopped retrying this source.");
                    }
                }

                if (workflow.Reflection.NeedsPolicyReview)
                {
                    var refreshedPolicy = await _policyAgent.LoadPolicyAsync(request);
                    if (refreshedPolicy.Rules.Count > 0)
                    {
                        workflow.Policy = refreshedPolicy;
                        stateChanged = true;
                        Trace(workflow, "PolicyAgent", $"Reflection retry {iteration}", "Reloaded policy through PolicyTool.");
                    }
                }

                if (workflow.Reflection.NeedsRecommendationRevision || stateChanged)
                {
                    workflow.Recommendation = _recommendationAgent.Recommend(workflow.Analysis, workflow.Policy);
                    stateChanged = true;
                    Trace(workflow, "RecommendationAgent", $"Reflection retry {iteration}", "Regenerated recommendations after validation feedback.");
                }

                if (!stateChanged)
                {
                    return;
                }

                workflow.Reflection = _reflectionAgent.Validate(
                    workflow.Data,
                    workflow.Analysis,
                    workflow.Policy,
                    workflow.Recommendation
                );
                Trace(
                    workflow,
                    "ReflectionAgent",
                    $"Validation iteration {iteration}",
                    workflow.Reflection.IsValid ? "Validation passed after retry." : "Validation still has blocking issues."
                );
            }
        }

        private static string CreateDataFingerprint(AgenticDataPackageDto data)
        {
            return string.Join(
                "|",
                data.CompetencyInputs
                    .OrderBy(input => input.EmployeeId)
                    .Select(input =>
                        $"{input.EmployeeId}:{input.TotalTasks}:{input.ApprovedTasks}:{input.ProgressUpdateCount}:{input.AttendanceDays}:{input.ApprovedLeaveDays}")
            ) + $"#missing:{string.Join(";", data.MissingData.OrderBy(item => item))}";
        }

        private static void NormalizeRequest(AgenticAiRunRequestDto request)
        {
            var now = DateTime.Now;

            if (request.Month < 1 || request.Month > 12)
                request.Month = now.Month;

            if (request.Year < 2000)
                request.Year = now.Year;

            if (string.IsNullOrWhiteSpace(request.Goal))
                request.Goal = "Evaluate competency and recommend manager actions.";
        }

        private static void Trace(AgenticAiWorkflowDto workflow, string agent, string action, string result)
        {
            workflow.Trace.Add(new AgenticTraceDto
            {
                Agent = agent,
                Action = action,
                Result = result,
                CreatedAt = DateTime.Now
            });
        }

        private static void ApplyLlmResult(AgenticAiWorkflowDto workflow, string agent, bool used, string message)
        {
            workflow.Llm.WasUsed = workflow.Llm.WasUsed || used;
            workflow.Llm.Mode = workflow.Llm.WasUsed ? "HybridRuleBasedAndLLM" : workflow.Llm.Mode;
            workflow.Llm.Notes.Add($"{agent}: {message}");
            Trace(workflow, agent, used ? "LLM enhancement" : "LLM fallback", message);
        }
    }
}
