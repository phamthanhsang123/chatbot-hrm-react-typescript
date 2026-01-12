"use client";

import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { user: string; bot: string }[]
  >([]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const res = await fetch("http://127.0.0.1:8000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input }),
    });

    const data = await res.json();

    setMessages([
      ...messages,
      { user: input, bot: data.reply },
    ]);
    setInput("");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <h1 className="text-2xl font-bold mb-4">
        HRM Chatbot
      </h1>

      <div className="w-full max-w-xl bg-white p-4 rounded shadow">
        <div className="space-y-3 mb-4">
          {messages.map((m, i) => (
            <div key={i}>
              <p><b>Bạn:</b> {m.user}</p>
              <p className="text-blue-600">
                <b>Bot:</b> {m.bot}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 border p-2 rounded"
            placeholder="Nhập câu hỏi..."
          />
          <button
            onClick={sendMessage}
            className="bg-blue-500 text-white px-4 rounded"
          >
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}
