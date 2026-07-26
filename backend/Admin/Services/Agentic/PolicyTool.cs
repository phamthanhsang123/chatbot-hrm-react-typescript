using Admin.DTOs;
using System.Text.Json;

namespace Admin.Services.Agentic
{
    public class PolicyTool
    {
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<PolicyTool> _logger;
        private readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        public PolicyTool(IWebHostEnvironment environment, ILogger<PolicyTool> logger)
        {
            _environment = environment;
            _logger = logger;
        }

        public async Task<AgenticPolicyContextDto> LoadAsync(AgenticAiRunRequestDto request)
        {
            var path = Path.Combine(_environment.ContentRootPath, "Data", "hr-policies.json");
            var context = new AgenticPolicyContextDto
            {
                Source = "PolicyTool: Data/hr-policies.json"
            };

            if (!File.Exists(path))
            {
                context.RagNotes.Add("Không tìm thấy tài liệu chính sách. Reflection Agent phải chặn đề xuất.");
                return context;
            }

            try
            {
                await using var stream = File.OpenRead(path);
                var document = await JsonSerializer.DeserializeAsync<PolicyDocument>(stream, _jsonOptions);

                if (document == null)
                {
                    context.RagNotes.Add("Tài liệu chính sách không đọc được.");
                    return context;
                }

                foreach (var rule in document.Rules.Where(rule => rule.Active))
                {
                    context.Rules.Add(new AgenticPolicyRuleDto
                    {
                        Code = rule.Code.Trim(),
                        Name = rule.Name.Trim(),
                        Description = rule.Description.Trim(),
                        Threshold = rule.Threshold
                    });
                }

                context.AppliedRules.AddRange(context.Rules.Select(rule => rule.Code));
                context.RagNotes.Add($"Policy version {document.Version}, cập nhật {document.UpdatedAt}.");
                context.RagNotes.Add("Policy được truy xuất qua Tool Layer; có thể thay PolicyTool bằng vector search/RAG mà không đổi các Agent khác.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Cannot load HR policy document from {Path}", path);
                context.RagNotes.Add("PolicyTool gặp lỗi khi đọc tài liệu chính sách.");
            }

            return context;
        }

        private sealed class PolicyDocument
        {
            public string Version { get; set; } = "";
            public string UpdatedAt { get; set; } = "";
            public List<PolicyRuleDocument> Rules { get; set; } = new();
        }

        private sealed class PolicyRuleDocument
        {
            public string Code { get; set; } = "";
            public string Name { get; set; } = "";
            public string Description { get; set; } = "";
            public decimal Threshold { get; set; }
            public bool Active { get; set; }
        }
    }
}
