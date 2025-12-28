import axios from 'axios';

// Backend URL
const API_BASE_URL = 'http://localhost:4000/api';

// Axios instance oluştur
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - Her isteğe token ekle
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Hata yönetimi
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// AUTH API'leri
export const authAPI = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  // YENİ:
register: (name, email, password, phoneNumber, role, apartmentCode, flatCount, flatId) => 
  api.post('/auth/register', { 
    name, 
    email, 
    password, 
    phoneNumber, 
    role: role ? 'admin' : 'resident',
    apartmentCode,
    flatCount, // Yönetici için
    flatId     // Sakin için
  }),

  logout: () =>
    api.post('/auth/logout'),

  getProfile: () =>
    api.get('/auth/profile'),

  verifyToken: () =>
    api.get('/auth/verify')
};

// DUYURU API'leri
export const announcementAPI = {
  getAll: (priority) =>
    api.get('/announcements', { params: { priority } }),

  getById: (id) =>
    api.get(`/announcements/${id}`),

  create: (title, content, priority) =>
    api.post('/announcements', { title, content, priority }),

  update: (id, title, content, priority) =>
    api.put(`/announcements/${id}`, { title, content, priority }),

  delete: (id) =>
    api.delete(`/announcements/${id}`)
};

// AİDAT API'leri
export const feeAPI = {
  getAll: (filters) =>
    api.get('/fees', { params: filters }),

  getById: (id) =>
    api.get(`/fees/${id}`),

  createPeriod: (month, year, amount, dueDate, description) =>
    api.post('/fees/period', { month, year, amount, dueDate, description }),

  addSingle: (flatId, amount, dueDate, month, year, description) =>
    api.post('/fees', { flatId, amount, dueDate, month, year, description }),

  updateStatus: (id, status, paymentMethod) =>
    api.put(`/fees/${id}/status`, { status, paymentMethod }),

  getDebtSummary: () =>
    api.get('/fees/summary'),

  getDebtorFlats: () =>
    api.get('/fees/debtors'),

  calculateDebt: (flatId) =>
    api.get(`/fees/debt/${flatId}`),

  delete: (id) =>
    api.delete(`/fees/${id}`)
};

// DAİRE API'leri
export const flatAPI = {
  getAll: () =>
    api.get('/flats'),

  getById: (id) =>
    api.get(`/flats/${id}`),

  create: (flatNumber, floor, block, residentCount) =>
    api.post('/flats', { flatNumber, floor, block, residentCount }),

  update: (id, flatNumber, floor, block, residentCount) =>
    api.put(`/flats/${id}`, { flatNumber, floor, block, residentCount }),

  delete: (id) =>
    api.delete(`/flats/${id}`),

  // ⭐ EKLENEN FONKSİYON — Yönetici ilk girişte toplu daire oluşturma
  generate: (count) =>
    api.post('/flats/generate', { count })
};

// OTOPARK API'leri
export const parkingAPI = {
  getAll: (status, floor) =>
    api.get('/parking', { params: { status, floor } }),

  getById: (id) =>
    api.get(`/parking/${id}`),

  getOccupied: () =>
    api.get('/parking/occupied'),

  getAvailable: () =>
    api.get('/parking/available'),

  create: (slotNumber, floor, block, type) =>
    api.post('/parking', { slotNumber, floor, block, type }),

  assignVehicle: (id, flatId, plateId) =>
    api.put(`/parking/${id}/assign`, { flatId, plateId }),

  removeVehicle: (id) =>
    api.put(`/parking/${id}/remove`),

  toggle: (id) =>
    api.put(`/parking/${id}/toggle`),

  delete: (id) =>
    api.delete(`/parking/${id}`)
};

// PLAKA API'leri
export const plateAPI = {
  getAll: () =>
    api.get('/plates'),

  getById: (id) =>
    api.get(`/plates/${id}`),

  create: (plateNumber, ownerName, flatId, vehicleModel, color) =>
    api.post('/plates', { plateNumber, ownerName, flatId, vehicleModel, color }),

  update: (id, plateNumber, ownerName, flatId, vehicleModel, color) =>
    api.put(`/plates/${id}`, { plateNumber, ownerName, flatId, vehicleModel, color }),

  delete: (id) =>
    api.delete(`/plates/${id}`)
};

// FİNANS API'leri
export const financeAPI = {
  getAll: (filters) =>
    api.get('/finance', { params: filters }),

  getById: (id) =>
    api.get(`/finance/${id}`),

  getSummary: (startDate, endDate) =>
    api.get('/finance/summary', { params: { startDate, endDate } }),

  getDetailedReport: (startDate, endDate) =>
    api.get('/finance/report/detailed', { params: { startDate, endDate } }),

  getMonthlyReport: (year) =>
    api.get('/finance/report/monthly', { params: { year } }),

  create: (type, description, amount, category, date, receiptUrl) =>
    api.post('/finance', { type, description, amount, category, date, receiptUrl }),

  update: (id, description, amount, category, transactionDate, receiptUrl) =>
    api.put(`/finance/${id}`, { description, amount, category, transactionDate, receiptUrl }),

  delete: (id) =>
    api.delete(`/finance/${id}`)
};

// MESAJ API'leri
export const messageAPI = {
  send: (receiverId, subject, content) =>
    api.post('/messages', { receiverId, subject, content }),

  getInbox: (isRead) =>
    api.get('/messages/inbox', { params: { isRead } }),

  getSent: () =>
    api.get('/messages/sent'),

  getById: (id) =>
    api.get(`/messages/${id}`),

  getConversation: (userId) =>
    api.get(`/messages/conversation/${userId}`),

  markAsRead: (id) =>
    api.put(`/messages/${id}/read`),

  delete: (id) =>
    api.delete(`/messages/${id}`),

  getUsers: () =>
    api.get('/messages/users/list')
};

export default api;