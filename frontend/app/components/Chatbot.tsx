'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Send,
  ShieldCheck,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getSessionEmail } from '@/services/authSession';
import {
  fetchAgenticAiStatus,
  queryAgenticAiData,
  type AgenticAiQueryResponseApi,
  type AgenticServiceStatusApi,
} from '@/services/agenticAi';
import { fetchEmployees, type EmployeeApiItem } from '@/services/employees';
import type { ManagementRole } from '../types';

interface ChatbotProps {
  userRole?: ManagementRole;
  departmentScope?: string;
}

interface AssistantMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  result?: AgenticAiQueryResponseApi;
  isError?: boolean;
}

function currentPeriodValue() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

function parsePeriod(value: string) {
  const [year, month] = value.split('-').map(Number);
  return { month, year };
}

function formatPeriod(value: string) {
  const { month, year } = parsePeriod(value);
  return `Tháng ${String(month).padStart(2, '0')}/${year}`;
}

function buildPeriodOptions() {
  const options: string[] = [];
  const start = new Date();
  start.setDate(1);

  for (let offset = -11; offset <= 0; offset += 1) {
    const date = new Date(start);
    date.setMonth(start.getMonth() + offset);
    options.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }

  return options.reverse();
}

const periodOptions = buildPeriodOptions();

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(-2).map((part) => part[0]).join('').toUpperCase() || 'AI';
}

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Không nhận được phản hồi từ hệ thống.';
  const jsonStart = message.indexOf('{');
  if (jsonStart >= 0) {
    try {
      const payload = JSON.parse(message.slice(jsonStart)) as { message?: string };
      if (payload.message) return payload.message;
    } catch {
      // Keep the original message when the response body is not valid JSON.
    }
  }
  if (message.includes('401')) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (message.includes('429')) return 'Dịch vụ AI đang giới hạn lượt gọi. Dữ liệu HRM không bị ảnh hưởng, vui lòng thử lại sau.';
  if (message.includes('Không tìm thấy nhân viên')) return 'Không tìm thấy nhân viên trong phạm vi bạn được quản lý.';
  return message;
}

function toolLabel(tool: string) {
  if (tool === 'AttendanceTool') return 'Chấm công';
  if (tool === 'LeaveTool') return 'Nghỉ phép';
  if (tool === 'AttendanceLeaveTool') return 'Chấm công & nghỉ phép';
  if (tool === 'SalaryTool') return 'Lương';
  if (tool === 'TaskTool') return 'Task';
  return 'Dữ liệu HRM';
}

export function Chatbot({
  userRole = 'admin',
  departmentScope,
}: ChatbotProps) {
  const [period, setPeriod] = useState(currentPeriodValue());
  const [identity, setIdentity] = useState<EmployeeApiItem | null>(null);
  const [employees, setEmployees] = useState<EmployeeApiItem[]>([]);
  const [serviceStatus, setServiceStatus] = useState<AgenticServiceStatusApi | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Tôi có thể tra cứu chấm công, giờ làm, nghỉ phép, lịch sử lương và tình hình task trong phạm vi bạn được phân quyền.',
    },
  ]);

  const selectedPeriod = useMemo(() => parsePeriod(period), [period]);

  const availableEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const role = employee.role?.toUpperCase();
      const isActive = employee.status !== 'inactive' && employee.status !== 'Đã nghỉ việc';
      if (!isActive || role === 'ADMIN') return false;
      if (userRole === 'manager') {
        return employee.id !== identity?.id
          && role !== 'MANAGER'
          && employee.departmentName === (identity?.departmentName || departmentScope);
      }
      return employee.id !== identity?.id;
    });
  }, [departmentScope, employees, identity, userRole]);

  const selectedEmployee = useMemo(
    () => availableEmployees.find((employee) => String(employee.id) === selectedEmployeeId) || null,
    [availableEmployees, selectedEmployeeId],
  );

  const suggestions = selectedEmployee
    ? [
        {
          label: 'Kiểm tra đi trễ',
          detail: 'Đối chiếu chấm công trong kỳ',
          question: `${selectedEmployee.fullName} đi trễ bao nhiêu ngày?`,
          icon: <Clock3 className="size-4" />,
        },
        {
          label: 'Tổng giờ làm',
          detail: 'Giờ công, tăng ca và thiếu công',
          question: `${selectedEmployee.fullName} làm bao nhiêu giờ trong tháng này?`,
          icon: <Clock3 className="size-4" />,
        },
        {
          label: 'Tổng quan nghỉ phép',
          detail: 'Đã duyệt, chờ duyệt và từ chối',
          question: `${selectedEmployee.fullName} nghỉ phép bao nhiêu ngày trong tháng này?`,
          icon: <CalendarDays className="size-4" />,
        },
        {
          label: 'Xem lịch sử lương',
          detail: 'Tổng hợp các kỳ đã thanh toán',
          question: `Tổng lương trước giờ của ${selectedEmployee.fullName}`,
          icon: <WalletCards className="size-4" />,
        },
        {
          label: 'Tổng quan task',
          detail: 'Tiến độ, review và quá hạn',
          question: `Tổng quan task của ${selectedEmployee.fullName}`,
          icon: <ClipboardList className="size-4" />,
        },
      ]
    : [];

  const loadContext = async () => {
    setBooting(true);
    try {
      const [employeeList, status] = await Promise.all([
        fetchEmployees(),
        fetchAgenticAiStatus(),
      ]);
      const email = getSessionEmail();
      const currentIdentity = employeeList.find((employee) =>
        employee.email.trim().toLowerCase() === email
      ) || null;

      setEmployees(employeeList);
      setIdentity(currentIdentity);
      setServiceStatus(status);
    } catch (error) {
      setServiceStatus(null);
      setMessages((current) => [
        ...current,
        {
          id: `boot-error-${Date.now()}`,
          role: 'assistant',
          content: friendlyError(error),
          isError: true,
        },
      ]);
    } finally {
      setBooting(false);
    }
  };

  useEffect(() => {
    void loadContext();
  }, []);

  useEffect(() => {
    if (!availableEmployees.length) {
      setSelectedEmployeeId('');
      return;
    }

    if (!availableEmployees.some((employee) => String(employee.id) === selectedEmployeeId)) {
      setSelectedEmployeeId(String(availableEmployees[0].id));
    }
  }, [availableEmployees, selectedEmployeeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [loading, messages]);

  const submitQuestion = async (question = query) => {
    const normalizedQuestion = question.trim();
    if (!normalizedQuestion || !identity || loading) return;

    const userMessage: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: normalizedQuestion,
    };
    setMessages((current) => [...current, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const result = await queryAgenticAiData({
        managerId: identity.id,
        question: normalizedQuestion,
        month: selectedPeriod.month,
        year: selectedPeriod.year,
      });
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${result.runId}`,
          role: 'assistant',
          content: result.answer,
          result,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: friendlyError(error),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetConversation = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: 'Cuộc trao đổi đã được làm mới. Bạn muốn kiểm tra chấm công, lương hay task?',
      },
    ]);
    setQuery('');
  };

  const scopeName = userRole === 'admin'
    ? 'Toàn hệ thống'
    : identity?.departmentName || departmentScope || 'Phòng ban của bạn';
  const llmReady = serviceStatus?.llm.isEnabled && serviceStatus?.llm.isConfigured;
  const assistantStatus = llmReady
    ? `${serviceStatus?.llm.provider || 'AI'} sẵn sàng`
    : 'Tra cứu có kiểm chứng';

  return (
    <div className="mx-auto flex min-h-[640px] max-w-7xl flex-col gap-4 xl:h-[calc(100vh-150px)]">
      <header className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <MessageSquareText className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-950">Trợ lý HR</h1>
              <Badge
                variant="outline"
                className={`h-6 ${llmReady
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'}`}
              >
                <span className={`mr-1.5 size-1.5 rounded-full ${llmReady ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {assistantStatus}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Hỏi dữ liệu đã được kiểm tra từ MySQL, trong đúng phạm vi phân quyền.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="size-4 text-emerald-600" />
          <span>Dữ liệu theo đúng phạm vi phân quyền</span>
          <Button
            variant="outline"
            size="icon"
            onClick={resetConversation}
            aria-label="Tạo cuộc trao đổi mới"
            title="Cuộc trao đổi mới"
            className="ml-2 size-9"
          >
            <RotateCcw className="size-4" />
          </Button>
        </div>
      </header>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="shrink-0 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="h-9 w-full bg-white sm:w-[260px]">
                  <UserRound className="mr-2 size-4 text-slate-500" />
                  <SelectValue placeholder="Chọn nhân viên" />
                </SelectTrigger>
                <SelectContent>
                  {availableEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={String(employee.id)}>
                      {employee.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="h-9 w-full bg-white sm:w-[170px]">
                  <CalendarDays className="mr-2 size-4 text-slate-500" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((item) => (
                    <SelectItem key={item} value={item}>{formatPeriod(item)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedEmployee && (
                <span className="truncate text-xs text-slate-500">
                  {selectedEmployee.departmentName || 'Chưa có phòng ban'}
                  {selectedEmployee.positionTitle ? ` · ${selectedEmployee.positionTitle}` : ''}
                </span>
              )}
            </div>
            <Badge variant="outline" className="w-fit border-slate-200 bg-white text-slate-600">
              {scopeName}
            </Badge>
          </div>

          {suggestions.length > 0 && (
            <div className="hide-scrollbar mt-3 flex gap-2 overflow-x-auto pb-0.5">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  onClick={() => void submitQuestion(suggestion.question)}
                  disabled={loading || booting}
                  title={suggestion.detail}
                  className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                >
                  {suggestion.icon}
                  {suggestion.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="hide-scrollbar flex-1 overflow-y-auto bg-slate-50/40 px-4 py-5 sm:px-6">
          <div className="mx-auto w-full max-w-4xl space-y-5">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} identity={identity} />
            ))}

            {loading && (
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Bot className="size-4" />
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin text-blue-600" />
                    Đang chọn nguồn dữ liệu và đối chiếu kết quả...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-end gap-2 rounded-lg border border-slate-300 bg-white p-2 shadow-sm transition-colors focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
              <textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void submitQuestion();
                  }
                }}
                placeholder="Hỏi về chấm công, nghỉ phép, lương hoặc task..."
                disabled={loading || booting}
                rows={1}
                aria-label="Nhập câu hỏi cho trợ lý HR"
                className="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60"
              />
              <Button
                onClick={() => void submitQuestion()}
                disabled={!identity || !query.trim() || loading || booting}
                size="icon"
                className="size-9 shrink-0 bg-blue-600 hover:bg-blue-700"
                aria-label="Gửi câu hỏi"
              >
                <Send className="size-4" />
              </Button>
            </div>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              Số liệu lấy từ hệ thống HRM; quyết định nhân sự vẫn cần Manager/HR xác nhận.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ChatMessage({
  message,
  identity,
}: {
  message: AssistantMessage;
  identity: EmployeeApiItem | null;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
        isUser ? 'bg-slate-800 text-white' : 'bg-blue-600 text-white'
      }`}>
        {isUser ? getInitials(identity?.fullName || 'NV') : <Bot className="size-4" />}
      </div>
      <div className={`${isUser ? 'max-w-[78%] text-right' : 'w-full max-w-[820px]'}`}>
        <div className={`rounded-lg border px-4 py-3 text-left text-sm leading-6 shadow-sm ${
          isUser
            ? 'border-slate-800 bg-slate-800 text-white'
            : message.isError
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-slate-200 bg-white text-slate-700'
        }`}>
          <p>{message.content}</p>
        </div>
        {message.result && <EvidenceSummary result={message.result} />}
      </div>
    </div>
  );
}

function EvidenceSummary({ result }: { result: AgenticAiQueryResponseApi }) {
  const attendanceItems = result.attendanceEvidences?.length
    ? result.attendanceEvidences
    : result.evidence
      ? [result.evidence]
      : [];
  const salaryItems = result.salaryEvidences?.length
    ? result.salaryEvidences
    : result.salaryEvidence
      ? [result.salaryEvidence]
      : [];
  const workHoursItems = result.workHoursEvidences?.length
    ? result.workHoursEvidences
    : result.workHoursEvidence
      ? [result.workHoursEvidence]
      : [];
  const leaveItems = result.leaveEvidences?.length
    ? result.leaveEvidences
    : result.leaveEvidence
      ? [result.leaveEvidence]
      : [];
  const taskItems = result.taskEvidences?.length
    ? result.taskEvidences
    : result.taskEvidence
      ? [result.taskEvidence]
      : [];
  const evidenceRule = attendanceItems[0]?.rule
    || workHoursItems[0]?.rule
    || leaveItems[0]?.rule
    || salaryItems[0]?.rule
    || taskItems[0]?.rule;
  const employeeNames = result.intent.employeeNames?.length
    ? result.intent.employeeNames
    : [result.intent.employeeName].filter(Boolean);
  const subjectLabel = employeeNames.join(' · ');

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-blue-200 bg-white text-blue-700">
            {toolLabel(result.intent.tool)}
          </Badge>
          <span className="text-xs text-slate-500">{subjectLabel}</span>
        </div>
        <span className="text-xs font-medium text-slate-500">
          {result.llm.wasUsed
            ? `${result.llm.provider || 'AI'} đã hỗ trợ diễn đạt`
            : 'Phản hồi từ hệ thống'}
        </span>
      </div>

      {attendanceItems.length > 0 && (
        <div className="divide-y divide-slate-100">
          {attendanceItems.map((evidence) => (
            <div key={evidence.employeeId} className="p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-800">{evidence.employeeName}</p>
                <span className="text-xs text-slate-500">
                  {evidence.lateDays} ngày trễ / {evidence.attendanceDays} ngày công
                </span>
              </div>
              {evidence.lateDates.length > 0 && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {evidence.lateDates.map((item) => (
                    <div key={`${item.date}-${item.checkInTime}`} className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <span className="font-semibold text-slate-900">
                        {new Date(item.date).toLocaleDateString('vi-VN')}
                      </span>
                      <span> · vào {item.checkInTime} · trễ {item.lateMinutes} phút</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {workHoursItems.length > 0 && (
        <div className="divide-y divide-slate-100">
          {workHoursItems.map((evidence) => (
            <div key={evidence.employeeId} className="p-3">
              <p className="mb-2 text-xs font-semibold text-slate-800">{evidence.employeeName}</p>
              <div className="grid grid-cols-2 gap-y-3 sm:grid-cols-4 sm:divide-x sm:divide-slate-100">
                <EvidenceMetric label="Tổng giờ" value={`${evidence.totalWorkedHours}h`} />
                <EvidenceMetric label="Ngày chấm công" value={evidence.attendanceDays} />
                <EvidenceMetric label="Tăng ca" value={`${evidence.overtimeHours}h`} />
                <EvidenceMetric label="Thiếu công" value={evidence.incompleteDays} />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Trung bình {evidence.averageWorkedHours}h/ngày · đi trễ {evidence.lateDays} · về sớm {evidence.earlyLeaveDays}
              </p>
            </div>
          ))}
        </div>
      )}

      {leaveItems.length > 0 && (
        <div className="divide-y divide-slate-100">
          {leaveItems.map((evidence) => (
            <div key={evidence.employeeId} className="p-3">
              <p className="mb-2 text-xs font-semibold text-slate-800">{evidence.employeeName}</p>
              <div className="grid grid-cols-2 gap-y-3 sm:grid-cols-4 sm:divide-x sm:divide-slate-100">
                <EvidenceMetric label="Đã duyệt" value={`${evidence.approvedDays} ngày`} />
                <EvidenceMetric label="Chờ duyệt" value={`${evidence.pendingDays} ngày`} />
                <EvidenceMetric label="Từ chối" value={`${evidence.rejectedDays} ngày`} />
                <EvidenceMetric label="Tổng đơn" value={evidence.totalRequests} />
              </div>
              {!evidence.hasLeaveBalanceData && (
                <p className="mt-2 text-[11px] text-amber-700">
                  Chưa có dữ liệu hạn mức phép năm để tính số phép còn lại.
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {salaryItems.length > 0 && (
        <div className="divide-y divide-slate-100">
          {salaryItems.map((evidence) => (
            <div key={evidence.employeeId} className="p-3">
              <p className="mb-2 text-xs font-semibold text-slate-800">{evidence.employeeName}</p>
              <div className="grid grid-cols-3 divide-x divide-slate-100 text-center">
                <EvidenceMetric label="Kỳ lương" value={evidence.totalPeriods} />
                <EvidenceMetric label="Đã thanh toán" value={`${evidence.paidNetSalary.toLocaleString('vi-VN')} đ`} />
                <EvidenceMetric label="Chờ thanh toán" value={`${evidence.pendingNetSalary.toLocaleString('vi-VN')} đ`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {taskItems.length > 0 && (
        <div className="divide-y divide-slate-100">
          {taskItems.map((evidence) => (
            <div key={evidence.employeeId} className="p-3">
              <p className="mb-2 text-xs font-semibold text-slate-800">{evidence.employeeName}</p>
              <div className="grid grid-cols-3 divide-x divide-slate-100 text-center">
                <EvidenceMetric label="Tổng task" value={evidence.totalTasks} />
                <EvidenceMetric label="Đã duyệt" value={evidence.approvedTasks} />
                <EvidenceMetric label="Quá hạn" value={evidence.overdueTasks} />
              </div>
            </div>
          ))}
        </div>
      )}

      <details className="border-t border-slate-100 px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-slate-500">
          Xem nguồn và quá trình kiểm tra
        </summary>
        <div className="mt-2 space-y-1 text-xs leading-5 text-slate-500">
          {evidenceRule && <p>Quy tắc: {evidenceRule}</p>}
          {result.trace.map((item, index) => (
            <p key={`${item.createdAt}-${index}`}>
              {index + 1}. {item.agent}: {item.result}
            </p>
          ))}
        </div>
      </details>
    </div>
  );
}

function EvidenceMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="px-2">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
