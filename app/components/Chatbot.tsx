'use client';

import { Send, Bot, User, Sparkles, Clock, TrendingUp } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Trash2 } from 'lucide-react';
import { chatWithBot, fetchChatHistory, fetchSessions, deleteSession } from '@/services/chatbot';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  time: string;
}

interface SessionItem {
  session_id: number;
  created_at: string;
  title?: string;
  last_message?: string;
}


export function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: 'Xin chào! Tôi là HR Assistant, trợ lý ảo của hệ thống HRM. Tôi có thể giúp gì cho bạn hôm nay? 😊',
      sender: 'bot',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [creatingSession, setCreatingSession] = useState(false);

  const USER_ID = 3; // TODO: sau này lấy từ login/JWT
  const API_BASE = 'http://localhost:8000';

  const handleDeleteSession = async (sid: number) => {
    const ok = confirm(`Xóa Session #${sid}? (Sẽ mất toàn bộ lịch sử)`);
    if (!ok) return;

    try {
      await deleteSession(USER_ID, sid);
      const list = await loadSessions();

      // nếu đang mở đúng session bị xóa -> chuyển sang session gần nhất hoặc reset
      if (sessionId === sid) {
        if (list.length > 0) {
          await selectSession(list[0].session_id);
        } else {
          setSessionId(null);
          setMessages([
            {
              id: Date.now(),
              text: 'Đã xóa. Bạn có thể bấm "Chat mới" để bắt đầu 😊',
              sender: 'bot',
              time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            },
          ]);
        }
      }
    } catch (err) {
      console.error('Delete session lỗi:', err);
      alert('❌ Xóa thất bại. Kiểm tra backend/log.');
    }
  };


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // ====== helper: tạo session chắc chắn ======
  const createSession = async (): Promise<number> => {
    setCreatingSession(true);
    try {
      const res = await fetch(`${API_BASE}/chat/session?user_id=${USER_ID}`, {
        method: 'POST',
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Create session failed: ${res.status} ${txt}`);
      }

      const data = await res.json();

      if (!data?.session_id) {
        throw new Error(`Create session response missing session_id: ${JSON.stringify(data)}`);
      }

      const sid = Number(data.session_id);
      setSessionId(sid);
      return sid;
    } finally {
      setCreatingSession(false);
    }
  };

  // ====== helper: load list session ======
  const loadSessions = async (): Promise<SessionItem[]> => {
    try {
      const list = await fetchSessions(USER_ID);
      setSessions(list);
      return list;
    } catch (err) {
      console.error('Load sessions lỗi:', err);
      setSessions([]);
      return [];
    }
  };


  // ====== INIT: tạo session mới khi vào trang (1 lần) + load session list ======
  useEffect(() => {
    const init = async () => {
      const list = await loadSessions();

      // ✅ Nếu có session thì mở session gần nhất (list đã sort DESC từ backend)
      if (list.length > 0) {
        await selectSession(list[0].session_id);
        return;
      }

      // ✅ Không có session nào: chỉ hiện lời chào, chờ user bấm "Chat mới" hoặc gửi tin nhắn
      setSessionId(null);
      setMessages([
        {
          id: Date.now(),
          text: 'Xin chào! Tôi là HR Assistant, trợ lý ảo của hệ thống HRM. Tôi có thể giúp gì cho bạn hôm nay? 😊',
          sender: 'bot',
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        },
      ]);
    };

    init();
  }, []);

  // ====== CLICK SESSION: load 10 messages gần nhất ======
  const selectSession = async (sid: number) => {
    try {
      setSessionId(sid);
      const history = await fetchChatHistory(sid);

      if (history && history.length > 0) {
        setMessages(history);
      } else {
        setMessages([
          {
            id: Date.now(),
            text: 'Session này chưa có tin nhắn. Bạn có thể bắt đầu chat 😊',
            sender: 'bot',
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          },
        ]);
      }
    } catch (err) {
      console.error('Load history lỗi:', err);
    }
  };

  // ====== TẠO CHAT MỚI ======
  const createNewSession = async () => {
    try {
      const sid = await createSession();
      await loadSessions();

      setMessages([
        {
          id: Date.now(),
          text: 'Xin chào! Tôi là HR Assistant, trợ lý ảo của hệ thống HRM. Tôi có thể giúp gì cho bạn hôm nay? 😊',
          sender: 'bot',
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        },
      ]);

      // nếu muốn load history (thường sẽ rỗng)
      // const history = await fetchChatHistory(sid);
      // if (history?.length) setMessages(history);

    } catch (err) {
      console.error('Create new session lỗi:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    const userText = inputMessage;

    // ✅ nếu sessionId null (do init chưa xong), tự tạo session ngay tại đây
    let sid = sessionId;
    if (!sid) {
      try {
        sid = await createSession();
        await loadSessions();
      } catch (err) {
        console.error('Không tạo được session khi gửi:', err);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            text: '❌ Không tạo được session. Kiểm tra backend đang chạy chưa (http://localhost:8000).',
            sender: 'bot',
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now(),
      text: userText,
      sender: 'user',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    const loadingId = Date.now() + 1;
    setMessages((prev) => [
      ...prev,
      {
        id: loadingId,
        text: 'Đang xử lý...',
        sender: 'bot',
        time: '',
      },
    ]);

    try {
      // ✅ GỌI BACKEND có session_id
      const data = await chatWithBot(userText, sid);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
              ...m,
              text: data.reply,
              time: new Date().toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            }
            : m
        )
      );

      // refresh list session
      await loadSessions();
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? { ...m, text: '❌ Không kết nối được server hoặc server lỗi' }
            : m
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  const quickActions = [
    { text: 'Xem ngày nghỉ phép còn lại', icon: '📅' },
    { text: 'Tạo đơn xin nghỉ phép', icon: '✍️' },
    { text: 'Xem bảng lương', icon: '💰' },
    { text: 'Quên chấm công - Bổ sung', icon: '⚠️' },
    { text: 'Kiểm tra chấm công', icon: '⏰' },
    { text: 'Liên hệ HR', icon: '📞' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="size-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Bot className="size-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-gray-900">HR Chatbot</h1>
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                <Sparkles className="size-3 mr-1" />
                AI Powered
              </Badge>
              <Badge className="bg-gray-100 text-gray-700 border-0">
                {sessionId ? `Session #${sessionId}` : (creatingSession ? 'Đang tạo session...' : 'Chưa có session')}
              </Badge>
            </div>
            <p className="text-gray-500 mt-1">Trợ lý ảo hỗ trợ nhân viên 24/7</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT: SESSION LIST */}
        <div className="lg:col-span-1">
          <Card className="p-4 shadow-lg border-0 h-[650px] flex flex-col">
            <Button onClick={createNewSession} className="w-full mb-4" disabled={creatingSession || isTyping}>
              + Chat mới
            </Button>

            <div className="flex-1 overflow-y-auto space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.session_id}
                  className={`w-full p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${sessionId === s.session_id
                      ? 'bg-blue-100 border-blue-200'
                      : 'bg-white hover:bg-gray-50 border-gray-100'
                    }`}
                >
                  <button
                    onClick={() => selectSession(s.session_id)}
                    className="flex-1 text-left"
                  >
                    <div className="text-sm font-medium line-clamp-1">
                      {s.title?.trim() ? s.title : `Session #${s.session_id}`}
                    </div>
                    <div className="text-xs text-gray-500 line-clamp-1">
                      {s.last_message?.trim() ? s.last_message : s.created_at}
                    </div>
                  </button>

                  <button
                    onClick={() => handleDeleteSession(s.session_id)}
                    className="p-2 rounded-lg hover:bg-white/60"
                    title="Xóa session"
                    disabled={creatingSession || isTyping}
                  >
                    <Trash2 className="size-4 text-gray-500 hover:text-red-600" />
                  </button>
                </div>
              ))}

            </div>
          </Card>
        </div>

        {/* RIGHT: CHAT UI */}
        <div className="lg:col-span-3">
          <Card className="h-[650px] flex flex-col overflow-hidden shadow-xl border-0">
            {/* Chat Header */}
            <div className="p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-lg">
                    <Bot className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">HR Assistant</h3>
                    <div className="flex items-center gap-2 text-sm text-blue-100">
                      <div className="size-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span>Đang hoạt động</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-blue-100">Session</div>
                  <div className="text-sm font-semibold">
                    {sessionId ? `#${sessionId}` : (creatingSession ? 'Đang tạo...' : '...')}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 animate-fadeIn ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`size-10 shrink-0 rounded-xl flex items-center justify-center shadow-md ${message.sender === 'bot'
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                      : 'bg-gradient-to-br from-gray-600 to-gray-700 text-white'
                      }`}
                  >
                    {message.sender === 'bot' ? <Bot className="size-5" /> : <User className="size-5" />}
                  </div>
                  <div className={`flex-1 ${message.sender === 'user' ? 'flex justify-end' : ''}`}>
                    <div
                      className={`max-w-md p-4 rounded-2xl shadow-md ${message.sender === 'bot'
                        ? 'bg-white border border-gray-100'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                        }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-line">{message.text}</p>
                      <div
                        className={`flex items-center gap-1 text-xs mt-2 ${message.sender === 'bot' ? 'text-gray-400' : 'text-blue-100'
                          }`}
                      >
                        <Clock className="size-3" />
                        <span>{message.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex gap-3 animate-fadeIn">
                  <div className="size-10 shrink-0 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
                    <Bot className="size-5" />
                  </div>
                  <div className="flex-1">
                    <div className="max-w-md p-4 rounded-2xl bg-white border border-gray-100 shadow-md">
                      <div className="flex gap-1">
                        <div className="size-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                        <div className="size-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="size-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-100">
              <div className="flex gap-3">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Nhập tin nhắn của bạn..."
                  className="flex-1 h-12 border-2 focus:border-blue-600 transition-all"
                  disabled={isTyping || creatingSession}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isTyping || creatingSession || !inputMessage.trim()}
                  className="h-12 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all hover:scale-105"
                >
                  <Send className="size-5" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Quick actions */}
      <Card className="p-6 shadow-lg border-0">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="size-5 text-blue-600" />
          <h3 className="font-semibold text-lg">Thao tác nhanh</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              onClick={() => setInputMessage(action.text)}
            >
              {action.icon} {action.text}
            </Button>
          ))}
        </div>
      </Card>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .bg-grid-pattern {
          background-image: 
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
}
