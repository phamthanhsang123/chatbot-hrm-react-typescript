'use client';

import { Send, Bot, User, Sparkles, Clock, TrendingUp } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  time: string;
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const getBotResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    if (message.includes('nghỉ phép') || message.includes('ngày nghỉ')) {
      return 'Bạn hiện có 12 ngày nghỉ phép năm còn lại. Bạn có muốn tạo đơn xin nghỉ phép không? Tôi có thể hướng dẫn bạn quy trình đăng ký đơn nghỉ phép.';
    } else if (message.includes('lương') || message.includes('thu nhập')) {
      return 'Bảng lương tháng này sẽ được phát hành vào ngày 5. Bạn có thể xem chi tiết bảng lương tại mục "Lương thưởng" trên hệ thống.';
    } else if (message.includes('quên chấm công') || message.includes('thiếu chấm công') || message.includes('bổ sung chấm công')) {
      return '🔔 Nếu bạn quên chấm công:\n\n1️⃣ Vào trang "Chấm công"\n2️⃣ Xem cảnh báo ngày thiếu chấm công\n3️⃣ Nhấn "Gửi đơn bổ sung ngay"\n4️⃣ Điền thông tin: Ngày, giờ vào/ra, lý do\n5️⃣ HR sẽ duyệt trong 24h\n\n⚠️ Lưu ý: Chỉ được gửi đơn bổ sung trong vòng 7 ngày. Vui lòng mô tả rõ lý do để HR dễ xem xét!';
    } else if (message.includes('hr') || message.includes('liên hệ')) {
      return 'Bạn có thể liên hệ bộ phận HR qua email: hr@company.com hoặc số điện thoại: 1900-xxxx. Thời gian làm việc: 8:00 - 17:30 các ngày trong tuần.';
    } else if (message.includes('chấm công') || message.includes('attendance')) {
      return 'Bạn đã chấm công đầy đủ trong tháng này. Tổng số ngày c��ng: 22 ngày. Bạn có thể xem chi tiết tại trang "Chấm công".\n\nNếu bạn quên chấm công, vui lòng gửi đơn bổ sung chấm công ngay!';
    } else if (message.includes('thưởng') || message.includes('bonus')) {
      return 'Thông tin về thưởng sẽ được công bố sau khi kết thúc quý. Bạn có thể theo dõi KPI của mình tại trang "Phân tích".';
    } else if (message.includes('bảo hiểm') || message.includes('bhxh')) {
      return 'Công ty đóng đầy đủ bảo hiểm xã hội, bảo hiểm y tế và bảo hiểm thất nghiệp theo quy định của pháp luật. Bạn cần hỗ trợ gì về bảo hiểm?';
    } else if (message.includes('tài liệu') || message.includes('hợp đồng')) {
      return 'Bạn có thể tải các tài liệu và hợp đồng lao động tại mục "Hồ sơ cá nhân". Nếu cần hỗ trợ, vui lòng liên hệ HR.';
    } else {
      return 'Cảm ơn bạn đã liên hệ! Tôi đã ghi nhận yêu cầu của bạn. Vui lòng chọn một trong các câu hỏi thường gặp bên cạnh hoặc bộ phận HR sẽ hỗ trợ bạn sớm nhất.';
    }
  };

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      const userMessage: Message = {
        id: messages.length + 1,
        text: inputMessage,
        sender: 'user',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');
      setIsTyping(true);

      // Simulate bot typing and response
      setTimeout(() => {
        setIsTyping(false);
        const botResponse: Message = {
          id: messages.length + 2,
          text: getBotResponse(inputMessage),
          sender: 'bot',
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, botResponse]);
      }, 1500);
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
            </div>
            <p className="text-gray-500 mt-1">Trợ lý ảo hỗ trợ nhân viên 24/7</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chatbot Interface */}
        <div className="lg:col-span-2">
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
                  <div className="text-xs text-blue-100">Phản hồi trong</div>
                  <div className="text-sm font-semibold">~2 giây</div>
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
                  <div className={`size-10 shrink-0 rounded-xl flex items-center justify-center shadow-md ${
                    message.sender === 'bot' 
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' 
                      : 'bg-gradient-to-br from-gray-600 to-gray-700 text-white'
                  }`}>
                    {message.sender === 'bot' ? <Bot className="size-5" /> : <User className="size-5" />}
                  </div>
                  <div className={`flex-1 ${message.sender === 'user' ? 'flex justify-end' : ''}`}>
                    <div className={`max-w-md p-4 rounded-2xl shadow-md ${
                      message.sender === 'bot'
                        ? 'bg-white border border-gray-100'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                    }`}>
                      <p className="text-sm leading-relaxed">{message.text}</p>
                      <div className={`flex items-center gap-1 text-xs mt-2 ${
                        message.sender === 'bot' ? 'text-gray-400' : 'text-blue-100'
                      }`}>
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
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Nhập tin nhắn của bạn..."
                  className="flex-1 h-12 border-2 focus:border-blue-600 transition-all"
                  disabled={isTyping}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={isTyping || !inputMessage.trim()}
                  className="h-12 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all hover:scale-105"
                >
                  <Send className="size-5" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="p-6 shadow-lg border-0">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="size-5 text-blue-600" />
              <h3 className="font-semibold text-lg">Thao tác nhanh</h3>
            </div>
            <div className="space-y-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className="w-full text-left p-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all text-sm border border-gray-100 hover:border-blue-200 flex items-center gap-3 group"
                  onClick={() => setInputMessage(action.text)}
                >
                  <span className="text-lg">{action.icon}</span>
                  <span className="group-hover:text-blue-700 transition-colors">{action.text}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Stats */}
          <Card className="p-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl border-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="size-5" />
                <h3 className="font-semibold text-lg">Thống kê</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <p className="text-sm text-blue-100 mb-1">Tổng cuộc hội thoại</p>
                  <p className="text-3xl font-bold">1,234</p>
                  <div className="text-xs text-green-300 mt-1">+12% so với tháng trước</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <p className="text-sm text-blue-100 mb-1">Hôm nay</p>
                  <p className="text-3xl font-bold">47</p>
                  <div className="text-xs text-green-300 mt-1">+5 so với hôm qua</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <p className="text-sm text-blue-100 mb-1">Độ hài lòng</p>
                  <p className="text-3xl font-bold">96%</p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="text-yellow-300">⭐</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* FAQs */}
          <Card className="p-6 shadow-lg border-0">
            <h3 className="font-semibold mb-4 text-lg">Câu hỏi thường gặp</h3>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <p className="font-medium text-gray-900 mb-1">⚠️ Quên chấm công?</p>
                <p className="text-gray-600 text-xs">Hỏi: "Quên chấm công - Bổ sung"</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <p className="font-medium text-gray-900 mb-1">💰 Làm sao để xem lương?</p>
                <p className="text-gray-600 text-xs">Hỏi: "Xem bảng lương"</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <p className="font-medium text-gray-900 mb-1">📅 Cách tạo đơn nghỉ phép?</p>
                <p className="text-gray-600 text-xs">Hỏi: "Tạo đơn nghỉ phép"</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <p className="font-medium text-gray-900 mb-1">📞 Liên hệ HR?</p>
                <p className="text-gray-600 text-xs">Hỏi: "Liên hệ HR"</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

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