// services/chatbot.ts
export const API_BASE = 'http://localhost:8000';

export async function chatWithBot(message: string, session_id: number) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`chatWithBot failed: ${res.status} ${txt}`);
  }

  return res.json(); // { reply: string }
}

export async function fetchChatHistory(session_id: number) {
  const res = await fetch(`${API_BASE}/chat/history/${session_id}`);

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`fetchChatHistory failed: ${res.status} ${txt}`);
  }

  // Backend trả về luôn mảng Message[]
  return res.json();
}

export async function fetchSessions(user_id: number, limit = 10) {
  const res = await fetch(`${API_BASE}/chat/sessions?user_id=${user_id}&limit=${limit}`);

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`fetchSessions failed: ${res.status} ${txt}`);
  }

  const data = await res.json();

  // Backend của bạn trả về array, nhưng mình thêm fallback phòng khi bạn đổi format
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.sessions)) return data.sessions;

  return [];
}


export async function deleteSession(user_id: number, session_id: number) {
  const res = await fetch(`${API_BASE}/chat/session/${session_id}?user_id=${user_id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`deleteSession failed: ${res.status} ${txt}`);
  }

  return res.json(); // { ok: true }
}
