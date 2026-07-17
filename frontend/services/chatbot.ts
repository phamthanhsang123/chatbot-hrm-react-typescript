import { API_BASE } from './apiBase';

export function getChatbotApiStatus() {
  return {
    apiBase: API_BASE,
    status: 'Chat session API is disabled. AI Assistant uses HRM data APIs instead.',
  };
}
