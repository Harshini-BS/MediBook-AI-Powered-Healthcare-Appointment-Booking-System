import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
});

// Appointment APIs
export const appointmentAPI = {
  create: (data: any) => API.post('/appointments', data),
  getByRef: (refId: string) => API.get(`/appointments/${refId}`),
  getAll: (params?: any) => API.get('/appointments', { params }),
  updateStatus: (refId: string, status: string) =>
    API.patch(`/appointments/${refId}/status`, { status }),
  delete: (refId: string) => API.delete(`/appointments/${refId}`),
  getStats: () => API.get('/appointments/stats'),
};

// AI APIs
export const aiAPI = {
  chat: (message: string, conversationHistory: any[]) =>
    API.post('/ai/chat', { message, conversationHistory }),

  suggestDepartment: (symptoms: string) =>
    API.post('/ai/suggest-department', { symptoms }),
};

export default API;