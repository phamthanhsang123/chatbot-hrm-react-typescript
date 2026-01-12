import { Send, Bot, User } from 'lucide-react';
import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from "./ui/button"
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
    { id: 1, text: 'Xin chào! Tôi là HR Chatbot. Tôi có thể giúp gì cho bạn?', sender: 'bot', time: '14:30' },
    { id: 2, text: 'Tôi muốn biết số ngày nghỉ phép còn lại', sender: 'user', time: '14:31' },
    { id: 3, text: 'Bạn còn 12 ngày nghỉ phép năm. Bạn có muốn tạo đơn xin nghỉ phép không?', sender: 'bot', time: '14:31' },
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      const newMessage: Message = {
        id: messages.length + 1,
        text: inputMessage,
        sender: 'user',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...messages, newMessage]);
      setInputMessage('');

      // Simulate bot response
      setTimeout(() => {
        const botResponse: Message = {
          id: messages.length + 2,
          text: 'Tôi đã ghi nhận yêu cầu của bạn. Bộ phận HR sẽ xử lý trong thời gian sớm nhất.',
          sender: 'bot',
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, botResponse]);
      }, 1000);
    }
  };

  const quickActions = [
    'Xem ngày nghỉ phép còn lại',
    'Tạo đơn xin nghỉ phép',
    'Xem bảng lương',
    'Liên hệ HR',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900">HR Chatbot</h1>
          <Badge className="bg-green-100 text-green-700">New</Badge>
        </div>
        <p className="text-gray-500 mt-1">Trợ lý ảo hỗ trợ nhân viên 24/7</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chatbot Interface */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center gap-3">
                <div className="size-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Bot className="size-6" />
                </div>
                <div>
                  <h3 className="font-semibold">HR Assistant</h3>
                  <p className="text-sm text-blue-100">Đang hoạt động</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`size-10 rounded-full flex items-center justify-center flex-shrink-0 ${message.sender === 'bot'
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                    : 'bg-gradient-to-br from-gray-500 to-gray-600 text-white'
                    }`}>
                    {message.sender === 'bot' ? <Bot className="size-5" /> : <User className="size-5" />}
                  </div>
                  <div className={`flex-1 ${message.sender === 'user' ? 'flex justify-end' : ''}`}>
                    <div className={`max-w-md p-4 rounded-2xl ${message.sender === 'bot'
                      ? 'bg-white shadow-sm'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      }`}>
                      <p className="text-sm">{message.text}</p>
                      <p className={`text-xs mt-1 ${message.sender === 'bot' ? 'text-gray-400' : 'text-blue-100'
                        }`}>{message.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Thao tác nhanh</h3>
            <div className="space-y-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors text-sm border border-gray-200"
                  onClick={() => setInputMessage(action)}
                >
                  {action}
                </button>
              ))}
            </div>
          </Card>

          {/* Stats */}
          <Card className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <h3 className="font-semibold mb-4">Thống kê chatbot</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-blue-100">Tổng cuộc hội thoại</p>
                <p className="text-2xl font-bold">1,234</p>
              </div>
              <div>
                <p className="text-sm text-blue-100">Hôm nay</p>
                <p className="text-2xl font-bold">47</p>
              </div>
              <div>
                <p className="text-sm text-blue-100">Độ hài lòng</p>
                <p className="text-2xl font-bold">96%</p>
              </div>
            </div>
          </Card>

          {/* FAQs */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Câu hỏi thường gặp</h3>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">Làm sao để xem lương?</p>
                <p className="text-gray-600 text-xs mt-1">Hỏi chatbot: "Xem bảng lương"</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">Cách tạo đơn nghỉ phép?</p>
                <p className="text-gray-600 text-xs mt-1">Hỏi chatbot: "Tạo đơn nghỉ phép"</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">Liên hệ HR?</p>
                <p className="text-gray-600 text-xs mt-1">Hỏi chatbot: "Liên hệ HR"</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
