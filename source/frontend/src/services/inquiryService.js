import axiosInstance from '../utils/axios';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const inquiryService = {
    // Public — không cần auth
    submitInquiry: async (data) => {
        const response = await axios.post(`${API_BASE}/inquiries/public`, data);
        return response.data;
    },

    getAll: async (page = 1, limit = 20, filters = {}) => {
        const params = { page, limit };
        if (filters.search) params.search = filters.search;
        if (filters.status !== undefined && filters.status !== null) params.status = filters.status;
        const response = await axiosInstance.get('/inquiries', { params });
        return response.data;
    },

    getById: async (id) => {
        const response = await axiosInstance.get(`/inquiries/${id}`);
        return response.data;
    },

    // ADMIN/SALE: review lần 1 — body: { approved: boolean }
    review: async (id, approved) => {
        const response = await axiosInstance.put(`/inquiries/${id}/review`, { approved });
        return response.data;
    },

    // ADMIN/CHUNG_TU: điền/sửa câu trả lời — body: { answer: string }
    submitAnswer: async (id, answer) => {
        const response = await axiosInstance.put(`/inquiries/${id}/answer`, { answer });
        return response.data;
    },

    // ADMIN/SALE/CHUNG_TU: cập nhật ghi chú nội bộ — body: { internalNote: string }
    updateNote: async (id, internalNote) => {
        const response = await axiosInstance.put(`/inquiries/${id}/note`, { internalNote });
        return response.data;
    },

    // ADMIN/SALE: review lần 2 + gửi email — body: { approved: boolean }
    reviewAndSend: async (id, approved) => {
        const response = await axiosInstance.put(`/inquiries/${id}/send`, { approved });
        return response.data;
    },
};

export default inquiryService;
